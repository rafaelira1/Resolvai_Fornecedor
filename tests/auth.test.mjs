import assert from 'node:assert/strict'
import test from 'node:test'
import { createAuthClient } from '../src/services/auth.js'
import { registerProvider } from '../src/services/providerRegistration.js'
import { getServiceCategories } from '../src/services/serviceCategories.js'
import { getProviderProfile } from '../src/services/fornecedores.js'

const origin = 'https://api.example.invalid'
const key = 'resolvai:provider-session:v1'
const id = '11111111-1111-4111-8111-111111111111'
const instant = Date.parse('2026-11-05T12:00:00Z')
const session = (changes = {}) => ({ accessToken: 'access-one', refreshToken: 'refresh-one', tokenType: 'Bearer', expiresAtUtc: '2026-11-05T13:00:00Z', user: { id, name: 'Conta sintética', email: 'provider@example.invalid', role: 'Prestador', isActive: true, createdAt: '2026-11-01T12:00:00Z' }, ...changes })
const response = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
function storage(initial = {}) {
  const map = new Map(Object.entries(initial))
  return { getItem: (name) => map.get(name) ?? null, setItem: (name, value) => map.set(name, value), removeItem: (name) => map.delete(name) }
}
function client(fetchImpl, initial = null) {
  const localStorage = storage(initial ? { [key]: JSON.stringify(initial) } : {})
  const sessionStorage = storage()
  return { auth: createAuthClient({ apiUrl: origin, fetchImpl, localStorage, sessionStorage, now: () => instant }), localStorage, sessionStorage }
}

test('provider login sends only credentials and stores no password with remember-access scope', async () => {
  for (const remember of [false, true]) {
    const { auth, localStorage, sessionStorage } = client(async (url, options) => {
      assert.equal(url, `${origin}/api/v1/auth/login-provider`)
      assert.deepEqual(JSON.parse(options.body), { email: 'provider@example.invalid', password: 'synthetic-password' })
      assert.equal(new Headers(options.headers).get('Authorization'), null)
      return response(200, session({ password: 'must-not-persist' }))
    })
    await auth.login({ email: ' provider@example.invalid ', password: 'synthetic-password', remember })
    const persisted = (remember ? localStorage : sessionStorage).getItem(key)
    assert.ok(persisted)
    assert.ok(!persisted.includes('password'))
    assert.equal((remember ? sessionStorage : localStorage).getItem(key), null)
    const restored = createAuthClient({ localStorage, sessionStorage, now: () => instant })
    assert.equal(restored.getSnapshot().user.id, id)
  }
})

test('malformed storage, inactive and Cliente sessions cannot enter professional area', async () => {
  for (const saved of ['{invalid', '{}', JSON.stringify(session({ user: { ...session().user, role: 'Cliente' } })), JSON.stringify(session({ user: { ...session().user, isActive: false } })), JSON.stringify(session({ expiresAtUtc: 'bad' })), JSON.stringify(session({ expiresAtUtc: '2026-11-04T12:00:00Z', refreshToken: undefined }))]) {
    const localStorage = storage({ [key]: saved, 'resolvai:orders:v1': 'keep' })
    const auth = createAuthClient({ localStorage, sessionStorage: storage(), now: () => instant })
    assert.equal(auth.getSnapshot(), null)
    assert.equal(localStorage.getItem(key), null)
    assert.equal(localStorage.getItem('resolvai:orders:v1'), 'keep')
  }
  const { auth } = client(async () => response(200, session({ user: { ...session().user, role: 'Cliente' } })))
  await assert.rejects(auth.login({ email: 'a@example.invalid', password: 'test' }), (e) => e.status === 403)
  assert.equal(auth.getSnapshot(), null)
})

test('expired concurrent requests refresh once and persist rotated tokens before retry', async () => {
  let refreshes = 0
  const { auth, localStorage } = client(async (url, options) => {
    if (url.endsWith('/auth/refresh-provider')) {
      refreshes++
      assert.deepEqual(JSON.parse(options.body), { refreshToken: 'refresh-one' })
      assert.equal(new Headers(options.headers).get('Authorization'), null)
      await new Promise((resolve) => setTimeout(resolve, 5))
      return response(200, session({ accessToken: 'access-two', refreshToken: 'refresh-two' }))
    }
    assert.equal(new Headers(options.headers).get('Authorization'), 'Bearer access-two')
    return response(200, { ok: true })
  }, session({ expiresAtUtc: '2026-11-05T11:59:59Z' }))
  assert.deepEqual(await Promise.all([auth.request('/private'), auth.request('/private')]), [{ ok: true }, { ok: true }])
  assert.equal(refreshes, 1)
  assert.equal(JSON.parse(localStorage.getItem(key)).refreshToken, 'refresh-two')
})

test('401 refreshes once and retries once, repeated refusal clears only auth storage', async () => {
  let attempts = 0
  let refreshes = 0
  const { auth, localStorage, sessionStorage } = client(async (url) => {
    if (url.endsWith('/auth/refresh-provider')) { refreshes++; return response(200, session({ accessToken: 'new-token' })) }
    attempts++
    return response(401, {})
  }, session())
  localStorage.setItem('resolvai:orders:v1', 'keep orders')
  sessionStorage.setItem('unrelated', 'keep')
  await assert.rejects(auth.request('/private'), (e) => e.status === 401)
  assert.equal(attempts, 2)
  assert.equal(refreshes, 1)
  assert.equal(auth.getSnapshot(), null)
  assert.equal(localStorage.getItem('resolvai:orders:v1'), 'keep orders')
  assert.equal(sessionStorage.getItem('unrelated'), 'keep')
})

test('concurrent stale 401 responses reuse the rotated session without a second refresh', async () => {
  let refreshes = 0
  const { auth } = client(async (url, options) => {
    if (url.endsWith('/auth/refresh-provider')) { refreshes++; return response(200, session({ accessToken: 'new-token' })) }
    if (new Headers(options.headers).get('Authorization') === 'Bearer access-one') {
      await new Promise((resolve) => setTimeout(resolve, 5))
      return response(401, {})
    }
    return response(200, { ok: true })
  }, session())
  await Promise.all([auth.request('/private'), auth.request('/private')])
  assert.equal(refreshes, 1)
})

test('refresh refusal, missing refresh and professional 403 invalidate access without loops', async () => {
  for (const status of [401, 403]) {
    let requests = 0
    const { auth } = client(async () => { requests++; return response(status, {}) }, session())
    await assert.rejects(auth.request('/private'), (e) => e.status === status)
    assert.equal(auth.getSnapshot(), null)
    assert.equal(requests, status === 401 ? 2 : 1)
  }
  const { auth } = client(async () => response(401, {}), session({ refreshToken: undefined }))
  await assert.rejects(auth.request('/private'))
  assert.equal(auth.getSnapshot(), null)
})

test('logout while refresh is in flight cannot restore the session', async () => {
  let release
  const { auth } = client(async () => new Promise((resolve) => { release = () => resolve(response(200, session())) }), session({ expiresAtUtc: '2026-11-04T12:00:00Z' }))
  const pending = auth.request('/private')
  auth.logout()
  release()
  await assert.rejects(pending)
  assert.equal(auth.getSnapshot(), null)
})

test('public registration and specialties stay anonymous alongside an authenticated session', async () => {
  const { auth } = client(async () => response(200, session()), session())
  assert.equal(auth.getSnapshot().user.id, id)
  const fetchImpl = async (url, options) => {
    assert.equal(new Headers(options.headers).get('Authorization'), null)
    return url.endsWith('/especialidades') ? response(200, [{ codigo: 'eletrica', nome: 'Elétrica' }]) : response(201, { idUsuario: id, tipoPessoa: 'PF', nomeExibicao: 'Perfil teste', cidadeAtuacao: 'Cidade teste', ufAtuacao: 'CE', raioAtendimentoKm: 20, especialidades: ['eletrica'], createdAt: '2026-11-01T12:00:00Z' })
  }
  await getServiceCategories({ apiUrl: origin, fetchImpl })
  await registerProvider({}, { apiUrl: origin, fetchImpl })
})

test('unavailable browser storage does not report a persisted login', async () => {
  const auth = createAuthClient({ fetchImpl: async () => response(200, session()), now: () => instant })
  await assert.rejects(auth.login({ email: 'provider@example.invalid', password: 'test' }), (e) => !e.uncertain)
  assert.equal(auth.getSnapshot(), null)
})

test('login and refresh refuse expired or mismatched replacement sessions', async () => {
  const { auth: expiredLogin } = client(async () => response(200, session({ expiresAtUtc: '2026-11-04T12:00:00Z' })))
  await assert.rejects(expiredLogin.login({ email: 'provider@example.invalid', password: 'test' }))
  for (const replacement of [session({ user: { ...session().user, role: 'Cliente' } }), session({ user: { ...session().user, id: '22222222-2222-4222-8222-222222222222' } }), session({ expiresAtUtc: '2026-11-04T12:00:00Z' })]) {
    const { auth } = client(async () => response(200, replacement), session({ expiresAtUtc: '2026-11-04T12:00:00Z' }))
    await assert.rejects(auth.request('/private'))
    assert.equal(auth.getSnapshot(), null)
  }
})

test('profile response extras cannot persist passwords or arbitrary session data', async () => {
  const { auth, sessionStorage } = client(async () => response(200, session()))
  await auth.login({ email: 'provider@example.invalid', password: 'test' })
  auth.setProfile({ idUsuario: id, name: 'Changed name', email: 'provider@example.invalid', nomeExibicao: 'Company', password: 'private-unexpected-value' })
  const stored = sessionStorage.getItem(key)
  assert.ok(!stored.includes('private-unexpected-value'))
  assert.ok(!stored.includes('password'))
  assert.equal(JSON.parse(stored).user.name, 'Changed name')
})

test('stale authenticated response after a newer login cannot reach the profile consumer or clear the newer session', async () => {
  let release
  const { auth } = client(async (url) => url.endsWith('/login-provider') ? response(200, session({ accessToken: 'new-login' })) : new Promise((resolve) => { release = () => resolve(response(200, { name: 'Old profile' })) }), session())
  const pending = auth.request('/private')
  await auth.login({ email: 'provider@example.invalid', password: 'test' })
  release()
  await assert.rejects(pending, (e) => e.status === 401)
  assert.equal(auth.getSnapshot().accessToken, 'new-login')
})

test('a cancelled protected profile read cannot publish its late response', async () => {
  let release
  const { auth } = client(async () => new Promise((resolve) => { release = () => resolve(response(200, { name: 'Late profile' })) }), session())
  const controller = new AbortController()
  const pending = auth.request('/private', { signal: controller.signal })
  controller.abort()
  release()
  await assert.rejects(pending, (e) => e.name === 'AbortError')
  assert.equal(auth.getSnapshot().accessToken, 'access-one')
})

test('abandoning login cannot persist a late session or cancel a newer successful login', async () => {
  let release
  let attempts = 0
  const { auth } = client(async () => ++attempts === 1 ? new Promise((resolve) => { release = () => resolve(response(200, session({ accessToken: 'abandoned' }))) }) : response(200, session({ accessToken: 'new-login' })))
  const controller = new AbortController()
  const abandoned = auth.login({ email: 'provider@example.invalid', password: 'test', signal: controller.signal })
  controller.abort()
  assert.equal(auth.getSnapshot(), null)
  await auth.login({ email: 'provider@example.invalid', password: 'test' })
  release()
  await assert.rejects(abandoned)
  assert.equal(auth.getSnapshot().accessToken, 'new-login')
})

test('cancelling a completed login while its profile loads clears only that operation session', async () => {
  const { auth } = client(async () => response(200, session()))
  const controller = new AbortController()
  await auth.login({ email: 'provider@example.invalid', password: 'test', signal: controller.signal })
  controller.abort()
  assert.equal(auth.getSnapshot(), null)
})

function sharedTabs(fetchImpl, initial = session()) {
  const localStorage = storage({ [key]: JSON.stringify(initial), unrelated: 'keep' })
  const events = new EventTarget()
  const tab = () => createAuthClient({ apiUrl: origin, fetchImpl, localStorage, sessionStorage: storage(), storageEvents: events, now: () => instant })
  const notify = (name = key) => {
    const event = new Event('storage')
    Object.assign(event, { key: name, storageArea: localStorage })
    events.dispatchEvent(event)
  }
  return { a: tab(), b: tab(), tab, localStorage, notify }
}

test('shared remembered logout synchronizes cached snapshots via storage events only for the auth key', () => {
  const { a, b, localStorage, notify } = sharedTabs()
  const snapshot = b.getSnapshot()
  assert.equal(b.getSnapshot(), snapshot)
  a.logout()
  notify('unrelated')
  assert.equal(b.getSnapshot(), snapshot)
  notify()
  assert.equal(b.getSnapshot(), null)
  assert.equal(localStorage.getItem('unrelated'), 'keep')
})

test('a delayed storage event cannot let an old tab restore a logged-out session through profile persistence', () => {
  const { a, b, localStorage } = sharedTabs()
  a.logout()
  assert.throws(() => b.setProfile({ idUsuario: id, name: 'Old', email: 'old@example.invalid' }), (e) => e.status === 401)
  assert.equal(b.getSnapshot(), null)
  assert.equal(localStorage.getItem(key), null)
})

for (const operation of ['refresh', 'profile']) {
  for (const replacement of [false, true]) {
    test(`late ${operation} cannot revive logout or overwrite replacement (replacement=${replacement}, no storage event)`, async () => {
      let release
      let released = false
      const { a, b, localStorage } = sharedTabs(async (url) => url.endsWith('/login-provider')
        ? response(200, session({ accessToken: 'replacement', user: { ...session().user, id: 'new-user' } }))
        : released ? response(200, {}) : new Promise((resolve) => { release = () => { released = true; resolve(response(200, operation === 'refresh' ? session() : { idUsuario: id, name: 'Old', email: 'old@example.invalid' })) } }),
      session({ expiresAtUtc: operation === 'refresh' ? '2026-11-04T12:00:00Z' : session().expiresAtUtc }))
      const pending = b.request('/profile')
      a.logout()
      if (replacement) await a.login({ email: 'new@example.invalid', password: 'test', remember: true })
      const saved = localStorage.getItem(key)
      release()
      await assert.rejects(pending, (e) => e.status === 401)
      assert.equal(localStorage.getItem(key), saved)
      if (replacement) assert.equal(JSON.parse(saved).accessToken, 'replacement')
      else assert.equal(b.getSnapshot(), null)
    })
  }
}

test('stale logout and cancellation cannot erase another tab newer remembered login', async () => {
  const { a, b, localStorage } = sharedTabs(async () => response(200, session({ accessToken: 'newer' })))
  await a.login({ email: 'new@example.invalid', password: 'test', remember: true })
  b.logout()
  assert.equal(JSON.parse(localStorage.getItem(key)).accessToken, 'newer')
  const controller = new AbortController()
  await b.login({ email: 'old@example.invalid', password: 'test', remember: true, signal: controller.signal })
  await a.login({ email: 'new@example.invalid', password: 'test', remember: true })
  const newer = localStorage.getItem(key)
  controller.abort()
  assert.equal(localStorage.getItem(key), newer)
})

test('non-remembered sessions stay tab-scoped and do not erase a later remembered account', async () => {
  const { a, b, localStorage, notify } = sharedTabs(async () => response(200, session()))
  await b.login({ email: 'b@example.invalid', password: 'test', remember: false })
  await a.login({ email: 'a@example.invalid', password: 'test', remember: true })
  notify()
  assert.ok(b.getSnapshot())
  b.setProfile({ idUsuario: id, name: 'Private tab', email: 'b@example.invalid' })
  assert.ok(localStorage.getItem(key))
  b.logout()
  assert.ok(localStorage.getItem(key))
})

test('a tab-scoped session reload never deletes a different remembered account', async () => {
  const localStorage = storage({ [key]: JSON.stringify(session({ accessToken: 'shared-account' })) })
  const sessionStorage = storage({ [key]: JSON.stringify(session({ accessToken: 'private-account' })) })
  const auth = createAuthClient({ localStorage, sessionStorage, now: () => instant })
  assert.equal(auth.getSnapshot().accessToken, 'private-account')
  assert.equal(JSON.parse(localStorage.getItem(key)).accessToken, 'shared-account')
})

test('a delayed replacement event cannot send an old tab operation using the new account', async () => {
  let protectedCalls = 0
  const { a, b } = sharedTabs(async (url) => {
    if (url.endsWith('/login-provider')) return response(200, session({ accessToken: 'new', user: { ...session().user, id: 'new-account' } }))
    protectedCalls++
    return response(200, {})
  })
  await a.login({ email: 'new@example.invalid', password: 'test', remember: true })
  await assert.rejects(b.request('/profile', { method: 'PATCH', body: { name: 'Old draft' } }), (e) => e.status === 401)
  assert.equal(protectedCalls, 0)
})

for (const status of [401, 403, 404]) {
  test(`late ${status} from an old tab cannot erase the replacement remembered account`, async () => {
    let release
    const { a, b, localStorage } = sharedTabs(async (url) => url.endsWith('/login-provider')
      ? response(200, session({ accessToken: 'replacement' }))
      : new Promise((resolve) => { release = () => resolve(response(status, {})) }))
    const pending = b.request('/profile')
    await a.login({ email: 'new@example.invalid', password: 'test', remember: true })
    const saved = localStorage.getItem(key)
    release()
    await assert.rejects(pending)
    assert.equal(localStorage.getItem(key), saved)
  })
}

test('a pending login cannot overwrite another tab login completed before its response', async () => {
  let release
  let attempts = 0
  const { a, b, localStorage } = sharedTabs(async () => ++attempts === 1
    ? new Promise((resolve) => { release = () => resolve(response(200, session({ accessToken: 'obsolete-login' }))) })
    : response(200, session({ accessToken: 'latest-login' })))
  const pending = b.login({ email: 'old@example.invalid', password: 'test', remember: true })
  await a.login({ email: 'new@example.invalid', password: 'test', remember: true })
  release()
  await assert.rejects(pending)
  assert.equal(JSON.parse(localStorage.getItem(key)).accessToken, 'latest-login')
})

test('a profile consumer handoff cannot clear a different login adopted after the request completed', async () => {
  const profile = { idUsuario: id, name: 'Old account', email: 'provider@example.invalid', telefone: '85999990000', cpf: '11144477735', tipoPessoa: 'PF', nomeExibicao: 'Synthetic', cnpj: null, cidadeAtuacao: 'Cidade teste', ufAtuacao: 'CE', raioAtendimentoKm: 20, bio: null, registroProfissional: null, especialidades: ['eletrica'], createdAt: '2026-11-01T12:00:00Z', updatedAt: null }
  const { a, b, localStorage, notify } = sharedTabs(async (url) => url.endsWith('/login-provider')
    ? response(200, session({ accessToken: 'replacement', user: { ...session().user, id: 'new-user' } }))
    : response(200, profile))
  const consumer = { ...b, request: async (...args) => {
    const result = await b.request(...args)
    await a.login({ email: 'new@example.invalid', password: 'test', remember: true })
    notify()
    return result
  } }
  await assert.rejects(getProviderProfile({ auth: consumer }), (e) => e.status === 401)
  assert.equal(b.getSnapshot().user.id, 'new-user')
  assert.equal(JSON.parse(localStorage.getItem(key)).accessToken, 'replacement')
})
