import assert from 'node:assert/strict'
import test from 'node:test'
import React, { act } from 'react'
import { create } from 'react-test-renderer'
import { createServer } from 'vite'

const userId = '10000000-0000-4000-8000-000000000001'
const firstId = '20000000-0000-4000-8000-000000000001'
const secondId = '20000000-0000-4000-8000-000000000002'
const profile = { idUsuario: userId, name: 'Profissional', email: 'test@example.invalid', telefone: '85999999999', tipoPessoa: 'PF', nomeExibicao: 'Profissional', cnpj: null, cidadeAtuacao: 'Fortaleza', ufAtuacao: 'CE', raioAtendimentoKm: 20, especialidades: ['eletrica'], createdAt: '2026-11-01T12:00:00Z' }
const session = { sessionId: 'verified-login', accessToken: 'test-token', tokenType: 'bearer', expiresAtUtc: '2099-01-01T00:00:00Z', user: { id: userId, name: 'Profissional', email: 'test@example.invalid', role: 'Prestador', isActive: true } }
function storage(saved) {
  const values = new Map(saved ? [['resolvai:provider-session:v1', JSON.stringify(saved)]] : [])
  return { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
}

async function application(t, { savedStorage } = {}) {
  const previous = { window: globalThis.window, document: globalThis.document, fetch: globalThis.fetch, act: globalThis.IS_REACT_ACT_ENVIRONMENT }
  let url = new URL('http://localhost:5173/home')
  const history = ['/home']
  let index = 0
  const events = Object.assign(new EventTarget(), { localStorage: storage(), sessionStorage: savedStorage ?? storage(session), scrollTo() {} })
  const fullLoads = []
  const setLocation = href => {
    url = new URL(href, 'http://localhost:5173')
    url.assign = value => fullLoads.push(value)
    url.replace = value => fullLoads.push(value)
  }
  setLocation('/home')
  Object.defineProperty(events, 'location', { get: () => url })
  events.history = {
    pushState(_state, _title, href) { history.splice(++index); history.push(href); setLocation(href) },
    back() { if (index) { setLocation(history[--index]); events.dispatchEvent(new Event('popstate')) } },
  }
  const document = Object.assign(new EventTarget(), { title: '' })
  globalThis.window = events
  globalThis.document = document
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const calls = []
  globalThis.fetch = async path => {
    calls.push(path)
    if (path === '/api/v1/fornecedores/me') return Response.json(profile)
    if (path === '/api/v1/especialidades') return Response.json([{ codigo: 'eletrica', nome: 'Elétrica' }])
    if (path.includes('/proposals?')) return Response.json({ items: [], page: 1, pageSize: 50, totalItems: 0, totalPages: 0 })
    if (path.endsWith('/summary')) return Response.json({ newOrdersLast24h: 0, compatibleOpenOrders: 0, proposals: { total: 0, sent: 0, viewed: 0, chosen: 0, notChosen: 0 } })
    if (path.includes('/oportunidades?')) {
      const size = Number(new URL(path, url).searchParams.get('pageSize'))
      return Response.json({ items: [], page: 1, pageSize: size, totalItems: 0, totalPages: 0, specialties: [{ codigo: 'eletrica', nome: 'Elétrica' }] })
    }
    if (path.includes('/oportunidades/')) {
      return Response.json({ id: firstId, title: 'Oportunidade salva', category: 'Elétrica', specialtyCode: 'eletrica',
        description: 'Escopo real', proposalsCount: 0, createdAt: '2026-11-09T12:00:00Z', photos: [] })
    }
    if (path.includes('/provider/orders/')) {
      const id = path.split('/').at(-1)
      return Response.json({ id, title: id === firstId ? 'Primeiro pedido' : 'Segundo pedido', description: 'Escopo real', customerFirstName: 'Maria', status: 'Pending', myProposal: { id: '30000000-0000-4000-8000-000000000001', orderId: id, orderTitle: 'Pedido', orderStatus: 'Pending', status: 'Chosen', value: 150, createdAt: '2026-11-09T12:00:00Z' } })
    }
    throw Error(`Unexpected route ${path}`)
  }
  const server = await createServer({ cacheDir: 'node_modules/.vite-navigation-tests', server: { middlewareMode: true, ws: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } })
  let renderer
  let closed = false
  const close = async () => {
    if (closed) return
    closed = true
    if (renderer) await act(() => renderer.unmount())
    await server.close()
    Object.assign(globalThis, { window: previous.window, document: previous.document, fetch: previous.fetch, IS_REACT_ACT_ENVIRONMENT: previous.act })
  }
  t.after(close)
  const { default: App } = await server.ssrLoadModule('/src/App.jsx')
  const { authSession } = await server.ssrLoadModule('/src/services/session.js')
  await act(async () => { renderer = create(React.createElement(App)) })
  return { renderer, calls, fullLoads, close, savedStorage: events.sessionStorage, auth: authSession, events, text: () => JSON.stringify(renderer.toJSON()), go: async href => {
    const link = { target: '', hasAttribute: () => false, getAttribute: () => href }
    const event = new Event('click', { cancelable: true })
    Object.defineProperties(event, { target: { value: { closest: () => link } }, button: { value: 0 } })
    await act(async () => document.dispatchEvent(event))
    assert.equal(event.defaultPrevented, true)
  } }
}

test('Home → My Orders → Home preserves the verified guard and reuses recent reads', async t => {
  const app = await application(t)
  assert.match(app.text(), /Olá/)
  await app.go('/pedidos')
  assert.match(app.text(), /Meus Pedidos/)
  assert.match(app.text(), /Você não tem pedidos aceitos/)
  await app.go('/home')
  assert.match(app.text(), /Olá/)
  assert.equal(app.calls.filter(path => path === '/api/v1/fornecedores/me').length, 1)
  assert.equal(app.calls.filter(path => path.includes('/proposals?')).length, 1)
  assert.equal(app.calls.filter(path => path.endsWith('/summary')).length, 1)
  assert.equal(app.calls.filter(path => path.includes('/oportunidades?')).length, 1)
  assert.deepEqual(app.fullLoads, [])
  await act(async () => app.events.history.back())
  assert.match(app.text(), /Meus Pedidos/)
  assert.equal(app.calls.filter(path => path === '/api/v1/fornecedores/me').length, 1)
})

test('changing only the order UUID loads the new record; logout clears private cached reads', async t => {
  const app = await application(t)
  await app.go(`/pedidos/detalhes?id=${firstId}`)
  assert.match(app.text(), /Primeiro pedido/)
  await app.go(`/pedidos/detalhes?id=${secondId}`)
  assert.match(app.text(), /Segundo pedido/)
  assert.doesNotMatch(app.text(), /Primeiro pedido/)
  await app.go(`/pedidos/detalhes?id=${firstId}`)
  assert.match(app.text(), /Primeiro pedido/)
  assert.equal(app.calls.filter(path => path.endsWith(firstId)).length, 1)
  await act(async () => app.auth.logout())
  assert.doesNotMatch(app.text(), /Primeiro pedido/)
  assert.ok(app.fullLoads.includes('/login'))
})

test('a browser reload restores saved screen data after confirming the same login profile', async t => {
  const first = await application(t)
  assert.match(first.text(), /Visão geral/)
  const savedStorage = first.savedStorage
  assert.ok(savedStorage.getItem('resolvai:provider-data:v1'))
  await first.close()
  const restored = await application(t, { savedStorage })
  assert.match(restored.text(), /Visão geral/)
  assert.deepEqual(restored.calls, ['/api/v1/fornecedores/me'], 'only the session/profile verification needs the API again')
  await restored.go('/pedidos')
  assert.match(restored.text(), /Você não tem pedidos aceitos/)
  assert.equal(restored.calls.length, 1)
})

test('feed, opportunity details, proposal form and profile reuse previously viewed read data', async t => {
  const app = await application(t)
  await app.go('/oportunidades')
  await app.go(`/oportunidades/detalhes?id=${firstId}`)
  assert.match(app.text(), /Oportunidade salva/)
  await app.go(`/oportunidades/proposta?id=${firstId}`)
  assert.match(app.text(), /Oportunidade salva/)
  await app.go(`/oportunidades/detalhes?id=${firstId}`)
  await app.go('/oportunidades')
  await app.go('/meu-perfil')
  assert.match(app.text(), /Meu perfil|Meu Perfil/)
  await app.go('/home')
  await app.go('/meu-perfil')
  assert.equal(app.calls.filter(path => path.endsWith(`/oportunidades/${firstId}`)).length, 1)
  assert.equal(app.calls.filter(path => path === '/api/v1/especialidades').length, 1)
  assert.equal(app.calls.filter(path => path.includes('/oportunidades?') && path.includes('pageSize=10')).length, 0, 'the complete Home feed already covers this page')
  assert.equal(app.calls.filter(path => path === '/api/v1/fornecedores/me').length, 1)
})
