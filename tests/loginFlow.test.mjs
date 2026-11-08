import assert from 'node:assert/strict'
import test from 'node:test'
import { createAuthClient } from '../src/services/auth.js'
import { getProviderProfile } from '../src/services/fornecedores.js'
import { createLoginFlow } from '../src/services/loginFlow.js'

const id = '11111111-1111-4111-8111-111111111111'
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const session = (token) => ({ accessToken: token, tokenType: 'Bearer', expiresAtUtc: '2099-01-01T12:00:00Z', refreshToken: 'refresh', user: { id, name: 'Conta teste', email: 'provider@example.invalid', role: 'Prestador', isActive: true } })
const profile = { idUsuario: id, name: 'Conta teste', email: 'provider@example.invalid', telefone: '85999990000', cpf: '11144477735', tipoPessoa: 'PF', nomeExibicao: 'Perfil teste', cnpj: null, cidadeAtuacao: 'Cidade teste', ufAtuacao: 'CE', raioAtendimentoKm: 20, bio: null, registroProfissional: null, especialidades: ['eletrica'], createdAt: '2026-11-01T12:00:00Z', updatedAt: null }
const credentials = { email: 'provider@example.invalid', password: 'test' }
function setup(fetchImpl) {
  const data = new Map()
  const store = { getItem: (key) => data.get(key), setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) }
  return createAuthClient({ fetchImpl, sessionStorage: store })
}
function form(auth) {
  const states = []
  const navigation = []
  const flow = createLoginFlow({ auth, loadProfile: getProviderProfile, onState: (state) => states.push(state), onSuccess: () => navigation.push('/home') })
  return { flow, states, navigation }
}

test('an abandoned form cannot clear a newer login or navigate after its late login settles', async () => {
  let release
  let logins = 0
  const auth = setup(async (url) => url.endsWith('/login-provider') ? ++logins === 1 ? new Promise((resolve) => { release = () => resolve(json(200, session('old'))) }) : json(200, session('new')) : json(200, profile))
  const oldForm = form(auth)
  const pending = oldForm.flow.submit(credentials)
  oldForm.flow.cancel()
  const oldStateCount = oldForm.states.length
  const newForm = form(auth)
  await newForm.flow.submit(credentials)
  assert.equal(auth.getSnapshot()?.accessToken, 'new')
  release()
  await pending
  assert.equal(auth.getSnapshot()?.accessToken, 'new')
  assert.deepEqual(oldForm.navigation, [])
  assert.equal(oldForm.states.length, oldStateCount)
  assert.deepEqual(newForm.navigation, ['/home'])
  newForm.flow.cancel() // A successful navigation unmount must preserve the session.
  assert.equal(auth.getSnapshot().accessToken, 'new')
})

test('abandoning a form during login keeps recovery open and cannot persist a late response', async () => {
  let release
  const auth = setup(async (url) => url.endsWith('/login-provider') ? new Promise((resolve) => { release = () => resolve(json(200, session('late'))) }) : json(200, profile))
  const current = form(auth)
  const pending = current.flow.submit(credentials)
  current.flow.cancel()
  const count = current.states.length
  release()
  await pending
  assert.equal(auth.getSnapshot(), null)
  assert.deepEqual(current.navigation, [])
  assert.equal(current.states.length, count)
})

test('abandoning profile verification cancels its read and suppresses late state and navigation', async () => {
  let release
  let profileSignal
  let profileStarted
  const started = new Promise((resolve) => { profileStarted = resolve })
  const auth = setup(async (url, options) => url.endsWith('/login-provider') ? json(200, session('profile-pending')) : new Promise((resolve) => { profileSignal = options.signal; release = () => resolve(json(200, profile)); profileStarted() }))
  const current = form(auth)
  const pending = current.flow.submit(credentials)
  await started
  current.flow.cancel()
  const count = current.states.length
  release()
  await pending
  assert.equal(profileSignal.aborted, true)
  assert.equal(auth.getSnapshot(), null)
  assert.deepEqual(current.navigation, [])
  assert.equal(current.states.length, count)
})

test('a current profile failure clears its own login and shows a recoverable form error', async () => {
  const auth = setup(async (url) => url.endsWith('/login-provider') ? json(200, session('failed-profile')) : json(500, {}))
  const current = form(auth)
  await current.flow.submit(credentials)
  assert.equal(auth.getSnapshot(), null)
  assert.equal(current.states.at(-1).loading, false)
  assert.ok(current.states.at(-1).error)
  assert.deepEqual(current.navigation, [])
})
