import assert from 'node:assert/strict'
import test from 'node:test'
import { createAuthClient } from '../src/services/auth.js'
import { activateProviderProfile } from '../src/services/fornecedores.js'
import { createRegistrationPayload, validateRegistration } from '../src/services/registrationValidation.js'
import { createLoginFlow } from '../src/services/loginFlow.js'

const key = 'resolvai:provider-session:v1'
const id = '11111111-1111-4111-8111-111111111111'
const session = (status = 'pending') => ({ accessToken: 'account-token', refreshToken: 'account-refresh', tokenType: 'bearer',
  expiresAtUtc: '2099-01-01T00:00:00Z', providerProfileStatus: status,
  user: { id, name: 'Cliente existente', email: 'cliente@example.invalid', role: 'Cliente', isActive: true, cpf: '52998224725' } })
const values = { name: 'Cliente existente', tipoPessoa: 'PF', cpf: '52998224725', telefone: '(85) 99999-7777',
  nomeExibicao: 'Profissional', cidadeAtuacao: 'Fortaleza', ufAtuacao: 'CE', raioAtendimentoKm: 20, especialidades: ['eletrica'] }
const profile = { ...values, idUsuario: id, email: 'cliente@example.invalid', telefone: '85999997777', cnpj: null,
  bio: null, registroProfissional: null, createdAt: '2026-11-01T12:00:00Z', updatedAt: null }
const json = (body, status = 200) => Response.json(body, { status })
function store(value) {
  const data = new Map(value ? [[key, JSON.stringify(value)]] : [])
  return { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) }
}

test('pending customer login persists its original identity and skips professional data until activation', async () => {
  const storage = store()
  const auth = createAuthClient({ sessionStorage: storage, fetchImpl: async () => json(session()) })
  const destinations = []
  const flow = createLoginFlow({ auth, loadProfile: () => assert.fail('Pending accounts cannot load the panel'), onState() {}, onSuccess: path => destinations.push(path) })
  await flow.submit({ email: values.email ?? 'cliente@example.invalid', password: 'SenhaExistente123' })
  flow.cancel()
  assert.deepEqual(destinations, ['/ativar-fornecedor'])
  assert.equal(auth.getSnapshot().user.role, 'Cliente')
  const restored = createAuthClient({ sessionStorage: storage })
  assert.equal(restored.getSnapshot().providerProfileStatus, 'pending')
  assert.equal(restored.getSnapshot().user.cpf, '52998224725')
})

test('activation payload validates professional fields and never sends credentials, role or another identity', () => {
  const dirty = { ...values, email: 'outra@example.invalid', password: 'Não deve sair', userId: 'other', role: 'Prestador' }
  assert.deepEqual(validateRegistration(values, { activation: true }), {})
  assert.ok(validateRegistration({ ...values, cpf: '11111111111' }, { activation: true }).cpf)
  const payload = createRegistrationPayload(dirty, { activation: true })
  for (const field of ['email', 'password', 'passwordConfirmation', 'role', 'userId']) assert.equal(Object.hasOwn(payload, field), false)
  assert.equal(payload.telefone, '85999997777')
  assert.equal(payload.cpf, values.cpf)
})

test('activation uses the existing bearer, confirms the profile and persists active status without changing role', async () => {
  const storage = store(session())
  const calls = []
  const auth = createAuthClient({ sessionStorage: storage, fetchImpl: async (path, options) => {
    calls.push({ path, options })
    return json(profile, 201)
  } })
  await activateProviderProfile(values, { auth })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].path, '/api/v1/fornecedores/me/complete-registration')
  assert.equal(calls[0].options.headers.Authorization, 'Bearer account-token')
  assert.equal(Object.hasOwn(JSON.parse(calls[0].options.body), 'email'), false)
  assert.equal(auth.getSnapshot().profile.idUsuario, id)
  assert.equal(auth.getSnapshot().providerProfileStatus, 'active')
  assert.equal(auth.getSnapshot().user.role, 'Cliente')
  assert.equal(JSON.parse(storage.getItem(key)).providerProfileStatus, 'active')
})

test('renewal revalidates supplier status while keeping the customer role', async () => {
  const saved = session('active')
  saved.expiresAtUtc = '2000-01-01T00:00:00Z'
  const calls = []
  const auth = createAuthClient({ sessionStorage: store(saved), fetchImpl: async path => {
    calls.push(path)
    return path.endsWith('/refresh-provider') ? json(session('active')) : json({ ok: true })
  } })
  assert.deepEqual(await auth.request('/protected'), { ok: true })
  assert.deepEqual(calls, ['/api/v1/auth/refresh-provider', '/protected'])
  assert.equal(auth.getSnapshot().user.role, 'Cliente')
  assert.equal(auth.getSnapshot().providerProfileStatus, 'active')
})

test('lost or duplicate activation responses recover only the same account profile', async () => {
  for (const status of [409, 500]) {
    const calls = []
    const auth = createAuthClient({ sessionStorage: store(session()), fetchImpl: async path => {
      calls.push(path)
      return path.endsWith('/complete-registration') ? json({}, status) : json(profile)
    } })
    await activateProviderProfile(values, { auth })
    assert.deepEqual(calls, ['/api/v1/fornecedores/me/complete-registration', '/api/v1/fornecedores/me'])
    assert.equal(auth.getSnapshot().providerProfileStatus, 'active')
  }
})

test('failed activation recovery retains a pending session and refuses a profile of another account', async () => {
  const auth = createAuthClient({ sessionStorage: store(session()), fetchImpl: async path => path.endsWith('/complete-registration') ? json({}, 409) : json({}, 403) })
  await assert.rejects(activateProviderProfile(values, { auth }), e => e.status === 409)
  assert.equal(auth.getSnapshot().providerProfileStatus, 'pending')
  const other = createAuthClient({ sessionStorage: store(session()), fetchImpl: async () => json({ ...profile, idUsuario: '22222222-2222-4222-8222-222222222222' }, 201) })
  await assert.rejects(activateProviderProfile(values, { auth: other }), e => e.status === 401)
  assert.equal(other.getSnapshot(), null)
})

test('a late activation response cannot attach a profile to a replacement login', async () => {
  let release
  const auth = createAuthClient({ sessionStorage: store(session()), fetchImpl: async path => path.endsWith('/complete-registration')
    ? new Promise(resolve => { release = () => resolve(json(profile, 201)) })
    : json({ ...session(), user: { ...session().user, id: '22222222-2222-4222-8222-222222222222' } }) })
  const pending = activateProviderProfile(values, { auth })
  await auth.login({ email: 'replacement@example.invalid', password: 'SenhaTeste123' })
  release()
  await assert.rejects(pending, e => e.status === 401)
  assert.equal(auth.getSnapshot().user.id, '22222222-2222-4222-8222-222222222222')
  assert.equal(auth.getSnapshot().profile, undefined)
})
