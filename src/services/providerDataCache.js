import { authSession } from './session.js'
import { providerCacheKeys, validProviderCacheData } from './providerCacheData.js'
import { deriveOpportunityPage } from './opportunitySnapshot.js'

const STORAGE_KEY = 'resolvai:provider-data:v1'
const MAX_STORAGE_BYTES = 2_000_000

// Persist only read results, scoped to a particular login and professional filters.
export function createProviderDataCache({ now = Date.now, ttlMs = 30_000, maxAgeMs = 30 * 60_000,
  storage, validate = () => true } = {}) {
  const scopes = new Map()
  const pending = new Map()
  let epoch = 0
  const abortError = () => new DOMException('Solicitação cancelada.', 'AbortError')
  const usable = entry => Number.isFinite(entry?.at) && now() >= entry.at && now() - entry.at < maxAgeMs
  const removeSaved = () => { try { storage?.removeItem(STORAGE_KEY) } catch { /* Keep memory caching if storage is unavailable. */ } }
  function persist() {
    if (!storage) return
    try {
      const rows = []
      for (const [scope, entries] of scopes) {
        for (const [key, entry] of entries) {
          if (typeof key === 'string' && usable(entry) && validate(key, entry.data)) rows.push({ scope, key, ...entry })
        }
      }
      const raw = JSON.stringify({ version: 1, rows: rows.slice(-50) })
      if (raw.length <= MAX_STORAGE_BYTES && rows.length) storage.setItem(STORAGE_KEY, raw)
      else removeSaved()
    } catch { /* Storage quota/private browsing must not break navigation. */ }
  }
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    if (raw) {
      if (raw.length > MAX_STORAGE_BYTES) throw new Error('Cache exceeds size limit')
      const saved = JSON.parse(raw)
      if (saved.version !== 1 || !Array.isArray(saved.rows) || saved.rows.length > 50) throw new Error('Invalid cache')
      for (const row of saved.rows) {
        if (!row || typeof row.scope !== 'string' || typeof row.key !== 'string' || !usable(row) || !validate(row.key, row.data)) continue
        if (!scopes.has(row.scope)) scopes.set(row.scope, new Map())
        scopes.get(row.scope).set(row.key, { data: row.data, at: row.at })
      }
    }
  } catch { removeSaved() }
  const cache = {
    get epoch() { return epoch },
    read(scope, key) {
      const stored = scopes.get(scope)?.get(key)
      const validEntries = [...(scopes.get(scope) ?? [])].filter(([, entry]) => usable(entry))
      const derived = deriveOpportunityPage(key, validEntries)
      const entry = derived && (!stored || derived.at > stored.at) ? derived : stored
      return entry && usable(entry) ? { ...entry, fresh: now() - entry.at < ttlMs } : null
    },
    write(scope, key, data, expectedEpoch) {
      if (expectedEpoch !== epoch) return
      if (!scopes.has(scope)) scopes.set(scope, new Map())
      const entries = scopes.get(scope)
      if (entries.size >= 50 && !entries.has(key)) entries.delete(entries.keys().next().value)
      entries.delete(key)
      entries.set(key, { data, at: now() })
      // List and detail use the same normalized service shape.
      if (key === providerCacheKeys.orders && Array.isArray(data)) {
        for (const order of data.slice(0, 45)) {
          if (order?.id && validProviderCacheData(providerCacheKeys.order(order.id), order)) {
            entries.set(providerCacheKeys.order(order.id), { data: order, at: now() })
          }
        }
      }
      while (entries.size > 50) entries.delete(entries.keys().next().value)
      persist()
    },
    retainScope(scope) {
      epoch++
      for (const jobs of pending.values()) for (const job of jobs.values()) job.controller.abort()
      pending.clear()
      for (const key of scopes.keys()) if (key !== scope) scopes.delete(key)
      persist()
    },
    remove(scope, key) {
      const entries = scopes.get(scope)
      entries?.delete(key)
      if (typeof key === 'string' && key.startsWith('opportunity:')) {
        for (const other of entries?.keys() ?? []) if (typeof other === 'string' && other.startsWith('opportunities:')) entries.delete(other)
      }
      persist()
    },
    fetch(scope, key, load, { signal, force = false } = {}) {
      if (signal?.aborted) return Promise.reject(abortError())
      const saved = cache.read(scope, key)
      if (!force && saved?.fresh) return Promise.resolve(saved.data)
      if (!pending.has(scope)) pending.set(scope, new Map())
      const jobs = pending.get(scope)
      let job = jobs.get(key)
      if (!job || job.controller.signal.aborted) {
        job = { controller: new AbortController(), consumers: new Set(), settled: false }
        const request = job
        const generation = epoch
        request.promise = Promise.resolve().then(() => load({ signal: request.controller.signal }))
          .then(data => {
            if (request.controller.signal.aborted || generation !== epoch) throw abortError()
            cache.write(scope, key, data, generation)
            return data
          }).catch(error => {
            if (generation === epoch && [401, 403, 404].includes(error.status)) cache.remove(scope, key)
            throw error
          }).finally(() => {
            request.settled = true
            if (jobs.get(key) === request) jobs.delete(key)
          })
        request.promise.catch(() => {})
        jobs.set(key, request)
      }
      const request = job
      return new Promise((resolve, reject) => {
        const consumer = {}
        let done = false
        const release = () => {
          signal?.removeEventListener('abort', abort)
          request.consumers.delete(consumer)
          queueMicrotask(() => {
            if (!request.settled && request.consumers.size === 0) request.controller.abort()
          })
        }
        const abort = () => { if (!done) { done = true; release(); reject(abortError()) } }
        request.consumers.add(consumer)
        signal?.addEventListener('abort', abort, { once: true })
        request.promise.then(data => { if (!done) { done = true; release(); resolve(data) } },
          error => { if (!done) { done = true; release(); reject(error) } })
      })
    },
    clear() {
      epoch++
      for (const jobs of pending.values()) for (const job of jobs.values()) job.controller.abort()
      pending.clear(); scopes.clear(); removeSaved()
    },
  }
  return cache
}

export function providerDataScope(session) {
  return JSON.stringify([session?.sessionId, session?.user.id, session?.profile?.cidadeAtuacao,
    session?.profile?.ufAtuacao, session?.profile?.especialidades])
}
function identity(session) { return JSON.stringify([session?.sessionId, session?.user.id]) }
function browserStorage() {
  try { return typeof window === 'undefined' ? undefined : window.sessionStorage } catch { return undefined }
}

export const providerDataCache = createProviderDataCache({ ttlMs: 5 * 60_000, storage: browserStorage(), validate: validProviderCacheData })
let previous = authSession.getSnapshot()
// A persisted response never replaces profile verification. Keep matching entries only
// after the restored login's profile has been confirmed through the API.
if (!previous) providerDataCache.clear()
authSession.subscribe(() => {
  const next = authSession.getSnapshot()
  if (identity(next) !== identity(previous) || (previous?.profile && providerDataScope(next) !== providerDataScope(previous))) {
    providerDataCache.clear()
  } else if (next?.profile && !previous?.profile) {
    providerDataCache.retainScope(providerDataScope(next))
  }
  previous = next
})
