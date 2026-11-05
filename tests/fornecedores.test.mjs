import assert from 'node:assert/strict'
import test from 'node:test'
import { createAuthClient } from '../src/services/auth.js'
import { getProviderProfile, updateProviderProfile } from '../src/services/fornecedores.js'

const id = '11111111-1111-4111-8111-111111111111'
const profile = (extra = {}) => ({ idUsuario: id, name: 'Conta teste', email: 'provider@example.invalid', telefone: '85999990000', cpf: '11144477735', tipoPessoa: 'PF', nomeExibicao: 'Serviços teste', cnpj: null, cidadeAtuacao: 'Cidade teste', ufAtuacao: 'CE', raioAtendimentoKm: 20, bio: null, registroProfissional: null, especialidades: ['eletrica'], createdAt: '2026-11-01T12:00:00Z', updatedAt: null, ...extra })
const response = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
function setup(fetchImpl) {
  const map = new Map()
  const store = { getItem: (key) => map.get(key), setItem: (key, value) => map.set(key, value), removeItem: (key) => map.delete(key) }
  const auth = createAuthClient({ sessionStorage: store, fetchImpl: (url, options) => url.endsWith('/login-provider') ? response(200, { accessToken: 'test-token', tokenType: 'Bearer', expiresAtUtc: '2099-01-01T12:00:00Z', refreshToken: 'refresh', user: { id, name: 'Old name', email: 'provider@example.invalid', role: 'Prestador', isActive: true } }) : fetchImpl(url, options) })
  return { auth, store }
}

test('GET profile confirms actual professional identity and nullable fields', async () => {
  const { auth } = setup(async (url, options) => {
    assert.equal(url, '/api/v1/fornecedores/me')
    assert.equal(options.method, 'GET')
    assert.equal(new Headers(options.headers).get('Authorization'), 'Bearer test-token')
    return response(200, profile())
  })
  await auth.login({ email: 'provider@example.invalid', password: 'test' })
  assert.deepEqual(await getProviderProfile({ auth }), profile())
  assert.equal(auth.getSnapshot().profile.nomeExibicao, 'Serviços teste')
})

test('PATCH sends complete editable fields only and uses confirmed response for identity after reload', async () => {
  let saved = profile()
  const { auth, store } = setup(async (_url, options) => {
    if (options.method === 'PATCH') {
      assert.deepEqual(JSON.parse(options.body), { name: 'New legal name', nomeExibicao: 'New company', telefone: '85999990000', cidadeAtuacao: 'Outra cidade', ufAtuacao: 'SP', raioAtendimentoKm: 40, bio: null, registroProfissional: null, especialidades: ['eletrica'] })
      saved = profile({ ...JSON.parse(options.body), nomeExibicao: 'Confirmed company' })
    }
    return response(200, saved)
  })
  await auth.login({ email: 'provider@example.invalid', password: 'test' })
  const result = await updateProviderProfile({ ...profile(), name: ' New legal name ', nomeExibicao: ' New company ', cidadeAtuacao: 'Outra cidade', ufAtuacao: 'sp', raioAtendimentoKm: '40', bio: '', registroProfissional: '' }, { auth })
  assert.equal(result.nomeExibicao, 'Confirmed company')
  assert.equal(auth.getSnapshot().profile.nomeExibicao, 'Confirmed company')
  const reloaded = createAuthClient({ sessionStorage: store, fetchImpl: async () => response(200, saved) })
  await getProviderProfile({ auth: reloaded })
  assert.equal(reloaded.getSnapshot().profile.nomeExibicao, 'Confirmed company')
})

test('invalid editable values never send PATCH or report success', async () => {
  let writes = 0
  const { auth } = setup(async () => { writes++; return response(200, profile()) })
  await auth.login({ email: 'provider@example.invalid', password: 'test' })
  for (const extra of [{ name: ' ' }, { telefone: 'bad' }, { especialidades: [] }, { raioAtendimentoKm: 201 }, { ufAtuacao: 'XX' }, { bio: 'x'.repeat(361) }]) {
    await assert.rejects(updateProviderProfile(profile(extra), { auth }))
  }
  assert.equal(writes, 0)
  assert.equal(auth.getSnapshot().profile, undefined)
})

test('profile failures preserve prior identity and reject malformed or foreign profiles', async () => {
  let mode = 'valid'
  const { auth } = setup(async () => mode === 'error' ? response(500, { private: 'upstream' }) : response(200, mode === 'foreign' ? profile({ idUsuario: '22222222-2222-4222-8222-222222222222' }) : mode === 'invalid' ? {} : profile()))
  await auth.login({ email: 'provider@example.invalid', password: 'test' })
  await getProviderProfile({ auth })
  mode = 'error'
  await assert.rejects(updateProviderProfile(profile(), { auth }), (e) => e.status === 500 && !e.uncertain && !e.message.includes('cadastro'))
  assert.equal(auth.getSnapshot().profile.nomeExibicao, 'Serviços teste')
  mode = 'invalid'
  await assert.rejects(getProviderProfile({ auth }))
  mode = 'foreign'
  await assert.rejects(getProviderProfile({ auth }))
  assert.equal(auth.getSnapshot(), null)
})

test('PATCH requires the complete radius instead of applying registration defaults', async () => {
  let writes = 0
  const { auth } = setup(async () => { writes++; return response(200, profile()) })
  await auth.login({ email: 'provider@example.invalid', password: 'test' })
  for (const raioAtendimentoKm of ['', ' ', undefined, null]) await assert.rejects(updateProviderProfile(profile({ raioAtendimentoKm }), { auth }))
  assert.equal(writes, 0)
})
