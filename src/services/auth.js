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

export function createAuthClient({ apiUrl, fetchImpl, localStorage, sessionStorage, now = Date.now } = {}) {
  const listeners = new Set()
  let current = null
  let remember = false
  let generation = 0
  let refreshFlight = null
  function remove(store) { try { store?.removeItem(STORAGE_KEY) } catch { /* Storage can be unavailable in private browsing. */ } }
  for (const [store, persistent] of [[sessionStorage, false], [localStorage, true]]) {
    try {
      const raw = store?.getItem(STORAGE_KEY)
      if (!raw) continue
      const restored = sanitizeSession(JSON.parse(raw), now)
      if (!restored) { remove(store); continue }
      if (!current) { current = restored; remember = persistent }
      else remove(store)
    } catch { remove(store) }
  }
  function emit() { listeners.forEach((listener) => listener()) }
  function logout() {
    generation++
    current = null
    refreshFlight = null
    remove(localStorage)
    remove(sessionStorage)
    emit()
  }
  function persist(value) {
    const target = remember ? localStorage : sessionStorage
    try {
      if (!target) throw new Error('Storage unavailable')
      // Store only the session contract; reload always confirms the profile through the API.
      target.setItem(STORAGE_KEY, JSON.stringify({
        accessToken: value.accessToken, tokenType: value.tokenType,
        expiresAtUtc: value.expiresAtUtc, refreshToken: value.refreshToken, user: value.user,
      }))
    }
    catch { logout(); throw new ApiError('Não foi possível guardar a sessão neste navegador. Habilite o armazenamento e tente novamente.') }
    remove(remember ? sessionStorage : localStorage)
    current = value
    emit()
    return value
  }
  async function login({ email, password, remember: keep = false }) {
    logout()
    const version = generation
    const result = await requestJson('/api/v1/auth/login-provider', {
      apiUrl, fetchImpl, method: 'POST', body: { email: email.trim(), password },
    })
    const valid = sanitizeSession(result, now)
    if (!valid || Date.parse(valid.expiresAtUtc) <= now()) throw new ApiError('O acesso exige uma conta profissional ativa e uma sessão válida.', { status: 403 })
    if (generation !== version) throw sessionError()
    remember = keep === true
    return persist(valid)
  }
  function refresh() {
    if (refreshFlight) return refreshFlight
    if (!current?.refreshToken) { logout(); return Promise.reject(sessionError()) }
    const version = generation
    const previous = current
    const operation = (async () => {
      try {
        const result = await requestJson('/api/v1/auth/refresh', {
          apiUrl, fetchImpl, method: 'POST', body: { refreshToken: previous.refreshToken },
        })
        if (generation !== version) throw sessionError()
        const valid = sanitizeSession(result, now)
        if (!valid || Date.parse(valid.expiresAtUtc) <= now() || valid.user.id !== previous.user.id) throw sessionError()
        // Some providers omit a new refresh token when the old one remains valid.
        if (!valid.refreshToken) valid.refreshToken = previous.refreshToken
        return persist({ ...valid, ...(previous.profile ? { profile: previous.profile } : {}) })
      } catch (error) {
        if (generation === version) logout()
        throw error
      }
    })()
    refreshFlight = operation
    operation.finally(() => { if (refreshFlight === operation) refreshFlight = null }).catch(() => {})
    return operation
  }
  async function request(path, options = {}) {
    if (!current) throw sessionError()
    if (Date.parse(current.expiresAtUtc) <= now()) await refresh()
    if (!current) throw sessionError()
    const version = generation
    const usedToken = current.accessToken
    const send = async () => {
      const result = await requestJson(path, { ...options, apiUrl, fetchImpl, accessToken: current.accessToken, registration: false })
      if (generation !== version) throw sessionError()
      if (options.signal?.aborted) throw new DOMException('Solicitação cancelada.', 'AbortError')
      return result
    }
    try {
      return await send()
    } catch (error) {
      if (generation !== version) throw sessionError()
      if (error.status === 403 || error.status === 404) { logout(); throw error }
      if (error.status !== 401) throw error
      if (current?.accessToken === usedToken) await refresh()
      if (!current || generation !== version) throw sessionError()
      try { return await send() }
      catch (retryError) {
        if ([401, 403, 404].includes(retryError.status) && generation === version) logout()
        throw retryError
      }
    }
  }
  function setProfile(profile) {
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
