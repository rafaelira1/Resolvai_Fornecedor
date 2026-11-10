import assert from 'node:assert/strict'
import test from 'node:test'
import React, { act } from 'react'
import { create } from 'react-test-renderer'
import { createServer } from 'vite'

const userId = '10000000-0000-4000-8000-000000000001'
const id = '20000000-0000-4000-8000-000000000001'
const secondId = '20000000-0000-4000-8000-000000000002'
const proposal = (changes = {}) => ({ id: '30000000-0000-4000-8000-000000000001', orderId: id, orderTitle: 'Serviço contratado real', orderStatus: 'Pending', status: 'Chosen', value: 450, deadline: '5 dias', warranty: '90 dias', createdAt: '2026-11-09T10:00:00Z', ...changes })
const details = (changes = {}) => ({ id, title: 'Serviço contratado real', status: 'Pending', customerFirstName: 'Maria', location: 'Fortaleza, CE', description: 'Escopo real do banco', myProposal: proposal(), ...changes })
const proposalsPage = (items = [proposal()]) => ({ items, page: 1, pageSize: 50, totalItems: items.length, totalPages: items.length ? 1 : 0 })
const opportunities = { items: [{ id: secondId, title: 'Oportunidade real do banco', category: 'Elétrica', specialtyCode: 'eletrica', location: 'Fortaleza, CE', createdAt: '2026-11-09T10:00:00Z', proposalsCount: 2 }], specialties: [{ codigo: 'eletrica', nome: 'Elétrica' }], page: 1, pageSize: 4, totalItems: 1, totalPages: 1 }
const summary = { newOrdersLast24h: 2, compatibleOpenOrders: 3, proposals: { total: 4, sent: 1, viewed: 1, chosen: 2, notChosen: 0 } }
function storage(value) {
  const values = new Map(value ? [['resolvai:provider-session:v1', JSON.stringify(value)]] : [])
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
}
async function renderPage(t, screen, fetcher) {
  const previous = { window: globalThis.window, document: globalThis.document, fetch: globalThis.fetch, act: globalThis.IS_REACT_ACT_ENVIRONMENT }
  const session = { sessionId: 'real-session', accessToken: 'test-token', tokenType: 'bearer', expiresAtUtc: '2099-01-01T00:00:00Z', user: { id: userId, name: 'Teste', email: 'test@example.invalid', role: 'Prestador', isActive: true } }
  const events = Object.assign(new EventTarget(), { localStorage: storage(), sessionStorage: storage(session), location: { search: `?id=${id}` } })
  globalThis.window = events
  globalThis.document = { title: '' }
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer test-token')
    return fetcher(url, options)
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const server = await createServer({ cacheDir: 'node_modules/.vite-provider-orders-tests', server: { middlewareMode: true, ws: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } })
  let renderer
  t.after(async () => {
    if (renderer) await act(() => renderer.unmount())
    await server.close()
    Object.assign(globalThis, { window: previous.window, document: previous.document, fetch: previous.fetch, IS_REACT_ACT_ENVIRONMENT: previous.act })
  })
  const { authSession } = await server.ssrLoadModule('/src/services/session.js')
  authSession.setProfile({ idUsuario: userId, name: 'Teste', email: 'test@example.invalid', nomeExibicao: 'Fornecedor real', especialidades: ['eletrica'], cidadeAtuacao: 'Fortaleza', ufAtuacao: 'CE' })
  const { default: Page } = await server.ssrLoadModule(`/src/pages/${screen === 'HomePage' ? 'Dashboard' : screen.replace(/Page$/, '')}/index.jsx`)
  await act(async () => { renderer = create(React.createElement(Page)) })
  return { renderer, auth: authSession, events, text: () => JSON.stringify(renderer.toJSON()), click: async label => {
    const button = renderer.root.findAllByType('button').find(node => node.children.includes(label))
    assert.ok(button, `Button ${label} exists`)
    await act(async () => button.props.onClick())
  } }
}

function fetchData(url) {
  if (url.includes('/proposals?')) return Response.json(proposalsPage())
  if (url.endsWith('/summary')) return Response.json(summary)
  if (url.includes('/oportunidades?')) return Response.json(opportunities)
  return Response.json(details())
}

test('My Orders shows real accepted/completed/cancelled records and UUID detail links', async t => {
  const states = ['Pending', 'InProgress', 'Completed', 'Cancelled']
  const proposals = states.map((status, i) => proposal({ id: `30000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, orderId: `20000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, orderStatus: status, orderTitle: `Pedido ${status}` }))
  const page = await renderPage(t, 'OrdersPage', async url => {
    if (url.includes('/proposals?')) return Response.json(proposalsPage(proposals))
    const item = proposals.find(p => url.endsWith(p.orderId))
    return Response.json(details({ id: item.orderId, title: item.orderTitle, status: item.orderStatus, myProposal: item }))
  })
  for (const label of ['Proposta aceita', 'Em andamento', 'Concluído', 'Cancelado', 'Maria']) assert.match(page.text(), new RegExp(label))
  assert.ok(page.renderer.root.findAllByType('a').some(node => node.props.href === `/pedidos/detalhes?id=${id}`))
  assert.doesNotMatch(page.text(), /Ygor|1850|50%|recebido|Pagamento liberado/)
})

test('loading, empty, failure and retry are distinct in My Orders', async t => {
  let release, mode = 'pending'
  const page = await renderPage(t, 'OrdersPage', async url => {
    if (mode === 'pending') return new Promise(resolve => { release = resolve })
    if (mode === 'failure') return Response.json({}, { status: 500 })
    return fetchData(url)
  })
  assert.match(page.text(), /Carregando seus pedidos/)
  assert.doesNotMatch(page.text(), /Você não tem pedidos/)
  await act(async () => release(Response.json(proposalsPage([]))))
  assert.match(page.text(), /Você não tem pedidos aceitos/)
  mode = 'failure'
  await page.click('Atualizar')
  assert.ok(page.renderer.root.findByProps({ role: 'alert' }))
  assert.doesNotMatch(page.text(), /Você não tem pedidos aceitos/)
  mode = 'success'
  await page.click('Tentar novamente')
  assert.match(page.text(), /Serviço contratado real/)
})

test('Home loads real summary, opportunities and contracted orders without fake financial metrics', async t => {
  const calls = []
  const page = await renderPage(t, 'HomePage', async url => { calls.push(url); return fetchData(url) })
  for (const value of ['Serviço contratado real', 'Oportunidade real do banco', 'Fornecedor real', 'Maria']) assert.match(page.text(), new RegExp(value))
  assert.ok(calls.some(url => url.endsWith('/summary')))
  assert.ok(calls.some(url => url.includes('pageSize=4')))
  const links = page.renderer.root.findAllByType('a').map(node => node.props.href)
  assert.ok(links.includes(`/pedidos/detalhes?id=${id}`))
  assert.ok(links.includes(`/oportunidades/detalhes?id=${secondId}`))
  assert.doesNotMatch(page.text(), /12\.400|94%|Ganhos no mês|Avaliação média|Compatibilidade|Infiltração no banheiro/)
})

test('Home keeps successful sections when opportunities fail and retries only that section', async t => {
  let failed = true
  const page = await renderPage(t, 'HomePage', async url => url.includes('/oportunidades?') && failed ? Response.json({}, { status: 500 }) : fetchData(url))
  assert.match(page.text(), /Serviço contratado real/)
  assert.doesNotMatch(page.text(), /Oportunidade real do banco/)
  assert.ok(page.renderer.root.findByProps({ role: 'alert' }))
  failed = false
  await page.click('Tentar novamente')
  assert.match(page.text(), /Oportunidade real do banco/)
})

test('late responses cannot replace refreshed orders, and logout removes previous account data', async t => {
  const pending = []
  const page = await renderPage(t, 'OrdersPage', async (url, options) => {
    if (url.includes('/proposals?')) return new Promise(resolve => pending.push({ resolve, signal: options.signal }))
    return Response.json(details())
  })
  await act(async () => page.events.dispatchEvent(new Event('focus')))
  assert.equal(pending.length, 1, 'focus must not restart an in-flight query')
  await act(async () => pending[0].resolve(Response.json(proposalsPage())))
  await act(async () => page.events.dispatchEvent(new Event('pageshow')))
  assert.equal(pending.length, 1, 'fresh data is reused')
  await page.click('Atualizar')
  assert.match(page.text(), /Serviço contratado real/, 'background refresh keeps confirmed data visible')
  await page.click('Atualizar')
  assert.equal(pending.length, 2, 'concurrent refreshes reuse the existing request')
  assert.equal(pending[1].signal.aborted, false)
  await act(async () => pending[1].resolve(Response.json(proposalsPage())))
  assert.match(page.text(), /Serviço contratado real/)
  await act(async () => page.auth.logout())
  assert.doesNotMatch(page.text(), /Serviço contratado real/)
})

test('real order detail survives reload; absent or unchosen orders show error without fallback or logout', async t => {
  let mode = 'success'
  const page = await renderPage(t, 'ServiceOrderPage', async () => mode === 'success' ? Response.json(details()) : Response.json({}, { status: 404 }))
  assert.match(page.text(), /Escopo real do banco/)
  assert.match(page.text(), /Proposta aceita/)
  assert.doesNotMatch(page.text(), /escrow|Pagamento confirmado|Marcar como concluído|demonstração/)
  mode = 'missing'
  await page.click('Atualizar pedido')
  assert.match(page.text(), /Pedido não encontrado/)
  assert.doesNotMatch(page.text(), /Escopo real do banco/)
  assert.ok(page.auth.getSnapshot())
})
