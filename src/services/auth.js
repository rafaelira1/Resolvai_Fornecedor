import { ApiError, requestJson } from './api.js'

const STORAGE_KEY = 'resolvai:provider-session:v1'
const sessionError = () => new ApiError('Sessão expirada. Entre novamente com sua conta profissional.', { status: 401 })

function sanitizeSession(value, now) {
  if (!value || typeof value.accessToken !== 'string' || !value.accessToken.trim()
    || value.tokenType?.toLowerCase() !== 'bearer'
    || !Number.isFinite(Date.parse(value.expiresAtUtc))
    || !value.user || value.user.role !== 'Prestador' || value.user.isActive !== true
    || typeof value.user.id !== 'string' || !value.user.id.trim()
    || typeof value.user.name !== 'string' || typeof value.user.email !== 'string') return null
  const refreshToken = typeof value.refreshToken === 'string' && value.refreshToken.trim() ? value.refreshToken : undefined
  if (Date.parse(value.expiresAtUtc) <= now() && !refreshToken) return null
  return {
    accessToken: value.accessToken, tokenType: 'Bearer', expiresAtUtc: value.expiresAtUtc,
    ...(refreshToken ? { refreshToken } : {}),
    user: { id: value.user.id, name: value.user.name, email: value.user.email, role: 'Prestador', isActive: true },
  }
}

export function createAuthClient({ apiUrl, fetchImpl, localStorage, sessionStorage, storageEvents, now = Date.now } = {}) {
  const listeners = new Set()
  let current = null
  let remember = false
  let generation = 0
  let refreshFlight = null
  let rememberedRaw = null
  let sessionId = null
  function readRemembered() { try { return localStorage?.getItem(STORAGE_KEY) ?? null } catch { return null } }
  function remove(store) { try { store?.removeItem(STORAGE_KEY) } catch { /* Storage can be unavailable in private browsing. */ } }
  for (const [store, persistent] of [[sessionStorage, false], [localStorage, true]]) {
    try {
      const raw = store?.getItem(STORAGE_KEY)
      if (!raw) continue
      const restored = sanitizeSession(JSON.parse(raw), now)
      if (!restored) { remove(store); continue }
      if (!current) {
        sessionId = JSON.parse(raw).sessionId ?? `legacy:${restored.accessToken}`
        current = { ...restored, sessionId }
        remember = persistent
        if (persistent) rememberedRaw = raw
      }
    } catch { remove(store) }
  }
  function emit() { listeners.forEach((listener) => listener()) }
  // Storage events can be delayed. Every publication also checks the exact record
  // it owns, so an obsolete tab cannot resurrect or erase another login.
  function synchronize() {
    if (!remember) return
    const raw = readRemembered()
    if (raw === rememberedRaw) return
    let restored = null
    let nextId = null
    try {
      const stored = JSON.parse(raw)
      restored = sanitizeSession(stored, now)
      nextId = stored?.sessionId ?? (restored ? `legacy:${restored.accessToken}` : null)
    } catch { /* Removed or malformed shared record revokes this tab. */ }
    const profile = nextId === sessionId && restored?.user.id === current?.user.id ? current?.profile : null
    generation++
    refreshFlight = null
    rememberedRaw = raw
    sessionId = nextId
    current = restored ? { ...restored, sessionId, ...(profile ? { profile } : {}) } : null
    emit()
  }
  storageEvents?.addEventListener('storage', (event) => {
    if ((event.key === STORAGE_KEY || event.key === null) && event.storageArea === localStorage) synchronize()
  })
  function assertVersion(version) {
    synchronize()
    if (generation !== version) throw sessionError()
  }
  function logout() {
    generation++
    current = null
    refreshFlight = null
    if (remember && readRemembered() === rememberedRaw) remove(localStorage)
    remove(sessionStorage)
    remember = false
    rememberedRaw = null
    sessionId = null
    emit()
  }
  function persist(value, version = generation) {
    assertVersion(version)
    const target = remember ? localStorage : sessionStorage
    try {
      if (!target) throw new Error('Storage unavailable')
      // Store only the session contract; reload always confirms the profile through the API.
      const raw = JSON.stringify({
        accessToken: value.accessToken, tokenType: value.tokenType,
        expiresAtUtc: value.expiresAtUtc, refreshToken: value.refreshToken, user: value.user, sessionId,
      })
      target.setItem(STORAGE_KEY, raw)
      if (remember) rememberedRaw = raw
    }
    catch { logout(); throw new ApiError('Não foi possível guardar a sessão neste navegador. Habilite o armazenamento e tente novamente.') }
    if (remember) remove(sessionStorage)
    current = { ...value, sessionId }
    emit()
    return current
  }
  async function login({ email, password, remember: keep = false, signal }) {
    logout()
    const version = generation
    const loginBaseline = readRemembered()
    // This signal owns the login and its subsequent profile verification, even
    // after the login response. Cancellation must never clear a newer login.
    const cancel = () => { if (generation === version) logout() }
    signal?.addEventListener('abort', cancel, { once: true })
    try {
      const result = await requestJson('/api/v1/auth/login-provider', {
        apiUrl, fetchImpl, signal, method: 'POST', body: { email: email.trim(), password },
      })
      if (signal?.aborted || generation !== version || readRemembered() !== loginBaseline) throw sessionError()
      const valid = sanitizeSession(result, now)
      if (!valid || Date.parse(valid.expiresAtUtc) <= now()) throw new ApiError('O acesso exige uma conta profissional ativa e uma sessão válida.', { status: 403 })
      remember = keep === true
      rememberedRaw = loginBaseline
      sessionId = globalThis.crypto.getRandomValues(new Uint32Array(4)).join('-')
      return persist(valid, version)
    } catch (error) {
      signal?.removeEventListener('abort', cancel)
      throw error
    }
  }
  function refresh() {
    synchronize()
    if (refreshFlight) return refreshFlight
    if (!current?.refreshToken) { logout(); return Promise.reject(sessionError()) }
    const version = generation
    const previous = current
    const operation = (async () => {
      try {
        const result = await requestJson('/api/v1/auth/refresh', {
          apiUrl, fetchImpl, method: 'POST', body: { refreshToken: previous.refreshToken },
        })
        assertVersion(version)
        const valid = sanitizeSession(result, now)
        if (!valid || Date.parse(valid.expiresAtUtc) <= now() || valid.user.id !== previous.user.id) throw sessionError()
        // Some providers omit a new refresh token when the old one remains valid.
        if (!valid.refreshToken) valid.refreshToken = previous.refreshToken
        return persist({ ...valid, ...(previous.profile ? { profile: previous.profile } : {}) })
      } catch (error) {
        synchronize()
        if (generation === version) logout()
        throw error
      }
    })()
    refreshFlight = operation
    operation.finally(() => { if (refreshFlight === operation) refreshFlight = null }).catch(() => {})
    return operation
  }
  async function request(path, options = {}) {
    assertVersion(generation)
    if (!current) throw sessionError()
    if (Date.parse(current.expiresAtUtc) <= now()) await refresh()
    if (!current) throw sessionError()
    const version = generation
    const usedToken = current.accessToken
    const invalidatesSession = (status) => status === 403 || (status === 404 && options.invalidateOnNotFound !== false)
    const send = async () => {
      const result = await requestJson(path, { ...options, apiUrl, fetchImpl, accessToken: current.accessToken, registration: false })
      assertVersion(version)
      if (options.signal?.aborted) throw new DOMException('Solicitação cancelada.', 'AbortError')
      return result
    }
    try {
      return await send()
    } catch (error) {
      assertVersion(version)
      if (invalidatesSession(error.status)) { logout(); throw error }
      if (error.status !== 401) throw error
      if (current?.accessToken === usedToken) await refresh()
      if (!current || generation !== version) throw sessionError()
      try { return await send() }
      catch (retryError) {
        synchronize()
        if ((retryError.status === 401 || invalidatesSession(retryError.status)) && generation === version) logout()
        throw retryError
      }
    }
  }
  function setProfile(profile, expectedSessionId = current?.sessionId) {
    const version = generation
    assertVersion(version)
    if (expectedSessionId !== current?.sessionId) throw sessionError()
    if (!current || profile.idUsuario !== current.user.id) { logout(); throw sessionError() }
    // Identity comes from the confirmed professional response, including after save.
    return persist({ ...current, user: { ...current.user, name: profile.name, email: profile.email }, profile })
  }
  return {
    login, logout, request, setProfile,
    getSnapshot: () => current,
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener) },
  }
}
