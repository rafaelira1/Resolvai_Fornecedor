import assert from 'node:assert/strict'
import test from 'node:test'
import { createAuthClient } from '../src/services/auth.js'
import { getOpportunities, getOpportunity, getOpportunityPhotoUrl } from '../src/services/opportunities.js'

const id = '20000000-0000-4000-8000-000000000001'
const providerId = '10000000-0000-4000-8000-000000000001'
const item = { id, title: 'Tomada sem energia', category: 'Elétrica', specialtyCode: 'eletrica', createdAt: '2026-11-01T12:00:00Z', proposalsCount: 0 }
const page = (changes = {}) => ({ items: [item], page: 1, pageSize: 10, totalItems: 1, totalPages: 1, specialties: [{ codigo: 'eletrica', nome: 'Elétrica' }], ...changes })

test('opportunities use the authenticated provider endpoint with server filters and pagination', async () => {
  const signal = new AbortController().signal
  const calls = []
  const auth = { request: async (...args) => { calls.push(args); return page({ page: 2, pageSize: 20 }) } }
  const result = await getOpportunities({ auth, signal, search: ' tomada ', category: 'eletrica', sort: 'proposals', page: 2, pageSize: 20 })
  const parsed = new URL(calls[0][0], 'http://test.invalid')
  assert.equal(parsed.pathname, '/api/v1/fornecedores/me/oportunidades')
  assert.deepEqual(Object.fromEntries(parsed.searchParams), { page: '2', pageSize: '20', search: 'tomada', category: 'eletrica', sort: 'proposals' })
  assert.equal(calls[0][1].signal, signal)
  assert.equal(parsed.searchParams.has('providerId'), false)
  assert.equal(result.items[0].id, id)
})

test('empty feeds remain empty, while failures and malformed feeds cannot become demonstration opportunities', async () => {
  const empty = page({ items: [], totalItems: 0, totalPages: 0, specialties: [] })
  assert.deepEqual(await getOpportunities({ auth: { request: async () => empty } }), empty)
  for (const response of [null, [], {}, page({ totalPages: 10 }), page({ items: [{ ...item, id: 1 }] }), page({ items: [item, item] }), page({ specialties: [] }), page({ items: [{ ...item, proposalsCount: -1 }] })]) {
    await assert.rejects(getOpportunities({ auth: { request: async () => response } }))
  }
  await assert.rejects(getOpportunities({ auth: { request: async () => { throw new Error('unavailable') } } }), /unavailable/)
})

test('details retain the real UUID and refuse missing, foreign or malformed records', async () => {
  const detail = { ...item, description: 'Descrição real', photos: [] }
  const calls = []
  assert.deepEqual(await getOpportunity(id, { auth: { request: async (...args) => { calls.push(args); return detail } } }), detail)
  assert.equal(calls[0][0], `/api/v1/fornecedores/me/oportunidades/${id}`)
  assert.equal(calls[0][1].invalidateOnNotFound, false)
  await assert.rejects(getOpportunity('1', { auth: { request: () => assert.fail('numeric demo ID must not load') } }), error => error.status === 404)
  for (const response of [{ ...detail, id: providerId }, { ...detail, photos: null }, { ...detail, description: null }, { ...detail, client: {} }, { ...detail, client: { name: 'Cliente', memberSince: 'invalid', ordersCount: 1, completedOrdersCount: 0 } }]) {
    await assert.rejects(getOpportunity(id, { auth: { request: async () => response } }))
  }
})

test('a disappeared opportunity does not log out a valid professional session, including after renewal', async () => {
  for (const needsRefresh of [false, true]) {
    let reads = 0
    const memory = new Map()
    const store = { getItem: key => memory.get(key), setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) }
    const session = { accessToken: 'session-token', refreshToken: 'refresh-token', tokenType: 'bearer', expiresAtUtc: '2099-01-01T00:00:00Z', user: { id: providerId, name: 'Teste', email: 'test@example.invalid', role: 'Prestador', isActive: true } }
    const auth = createAuthClient({ sessionStorage: store, fetchImpl: async (url, options) => {
      if (url.endsWith('/login-provider') || url.endsWith('/auth/refresh-provider')) return Response.json(session)
      assert.equal(options.headers.Authorization, 'Bearer session-token')
      reads++
      return Response.json({}, { status: needsRefresh && reads === 1 ? 401 : 404 })
    } })
    await auth.login({ email: 'test@example.invalid', password: 'test' })
    await assert.rejects(getOpportunity(id, { auth }), error => error.status === 404)
    assert.equal(auth.getSnapshot().user.id, providerId)
    assert.equal(reads, needsRefresh ? 2 : 1)
  }
})

test('photos only open supported public web URLs', () => {
  assert.equal(getOpportunityPhotoUrl('https://example.invalid/photo.jpg'), 'https://example.invalid/photo.jpg')
  for (const value of ['javascript:alert(1)', 'data:text/html,test', '/private/path', 'https://user:password@example.invalid/photo.jpg']) assert.equal(getOpportunityPhotoUrl(value), null)
})
