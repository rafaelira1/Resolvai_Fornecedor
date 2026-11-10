import assert from 'node:assert/strict'
import test from 'node:test'
import { getMyOrder, getMyOrders, getProviderSummary, loadChatDraft, saveChatDraft } from '../src/services/orders.js'
import { groupOrders } from '../src/data/orders.js'

export const id = '20000000-0000-4000-8000-000000000001'
export const proposalId = '30000000-0000-4000-8000-000000000001'
const otherId = '20000000-0000-4000-8000-000000000002'
const proposal = (changes = {}) => ({ id: proposalId, orderId: id, orderTitle: 'Reparo real', orderLocation: 'Fortaleza, CE', orderStatus: 'Pending', status: 'Chosen', value: 350.5, deadline: '3 dias', deadlineDays: 3, warranty: '90 dias', description: 'Troca da instalação elétrica', createdAt: '2026-11-09T10:00:00Z', ...changes })
const detail = (changes = {}) => ({ id, title: 'Reparo real', customerFirstName: 'Maria', location: 'Fortaleza, CE', description: 'Escopo do pedido', status: 'Pending', myProposal: proposal(), ...changes })
const page = (items = [proposal()], changes = {}) => ({ items, page: 1, pageSize: 50, totalItems: items.length, totalPages: items.length ? 1 : 0, ...changes })
const summary = () => ({ newOrdersLast24h: 2, compatibleOpenOrders: 4, proposals: { total: 5, sent: 1, viewed: 1, chosen: 2, notChosen: 1 } })

test('only chosen proposals become services; pending acceptance does not imply execution or payment', async () => {
  const calls = []
  const auth = { request: async (path, options) => { calls.push({ path, options }); return path.includes('/proposals?') ? page() : detail() } }
  const controller = new AbortController()
  const orders = await getMyOrders({ auth, signal: controller.signal })
  assert.match(calls[0].path, /status=chosen&page=1&pageSize=50/)
  assert.equal(calls[1].path, `/api/v1/provider/orders/${id}`)
  assert.equal(calls[1].options.invalidateOnNotFound, false)
  assert.equal(calls[1].options.signal, controller.signal)
  assert.equal(orders[0].customer, 'Maria')
  assert.equal(orders[0].value, 350.5)
  assert.equal(orders[0].status, 'accepted')
  assert.equal(orders[0].completedAt, undefined)
  assert.equal(orders[0].rating, undefined)
})

test('all pages are loaded with bounded detail concurrency, including orders beyond the first 50', async () => {
  const proposals = Array.from({ length: 51 }, (_, i) => proposal({ orderId: `20000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, id: `30000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}` }))
  let simultaneous = 0, max = 0
  const pages = []
  const auth = { request: async path => {
    if (path.includes('/proposals?')) {
      const number = Number(new URL(path, 'https://example.invalid').searchParams.get('page'))
      pages.push(number)
      return page(proposals.slice((number - 1) * 50, number * 50), { page: number, totalItems: 51, totalPages: 2 })
    }
    simultaneous++; max = Math.max(max, simultaneous)
    await new Promise(resolve => setTimeout(resolve, 1))
    simultaneous--
    const p = proposals.find(item => path.endsWith(item.orderId))
    return detail({ id: p.orderId, myProposal: p })
  } }
  const result = await getMyOrders({ auth })
  assert.deepEqual(pages, [1, 2])
  assert.equal(result.length, 51)
  assert.equal(result.at(-1).id, proposals.at(-1).orderId)
  assert.ok(max <= 4)
})

test('empty API results stay empty and never use demonstration records or local statuses', async () => {
  let calls = 0
  assert.deepEqual(await getMyOrders({ auth: { request: async () => { calls++; return page([]) } } }), [])
  assert.equal(calls, 1)
})

test('all database statuses are mapped and cancelled services are not counted as active', async () => {
  const mapped = []
  for (const status of ['Pending', 'InProgress', 'Completed', 'Cancelled']) {
    mapped.push(await getMyOrder(id, { auth: { request: async () => detail({ status, myProposal: proposal({ orderStatus: status }) }) } }))
  }
  assert.deepEqual(mapped.map(item => item.status), ['accepted', 'in_progress', 'completed', 'cancelled'])
  const groups = groupOrders(mapped)
  assert.equal(groups.active.length, 2)
  assert.equal(groups.completed.length, 1)
  assert.equal(groups.cancelled.length, 1)
})

test('foreign IDs and unchosen proposals cannot become services', async () => {
  for (const changes of [{ id: otherId }, { myProposal: undefined }, { myProposal: proposal({ status: 'Sent' }) }, { myProposal: proposal({ orderId: otherId }) }, { myProposal: proposal({ orderStatus: 'Completed' }) }]) {
    await assert.rejects(getMyOrder(id, { auth: { request: async () => detail(changes) } }))
  }
  await assert.rejects(getMyOrder('1', { auth: { request() { assert.fail('invalid UUID must not be requested') } } }), { status: 404 })
})

test('resource 404 does not invalidate the session; server/network errors are not converted to empty lists', async () => {
  await assert.rejects(getMyOrder(id, { auth: { request: async (_path, options) => {
    assert.equal(options.invalidateOnNotFound, false)
    throw Object.assign(new Error('not found'), { status: 404 })
  } } }), { status: 404 })
  const failure = Object.assign(new Error('Serviço indisponível'), { status: 500 })
  await assert.rejects(getMyOrders({ auth: { request: async () => { throw failure } } }), error => error === failure)
})

test('malformed pagination, duplicate services and invalid proposals are rejected', async () => {
  const invalidPages = [page([proposal({ value: NaN })]), page([proposal({ status: 'Sent' })]), page([proposal(), proposal()]), page([], { totalItems: 1, totalPages: 1 }), page([proposal()], { page: 2 }), page([proposal()], { totalPages: 2 })]
  for (const result of invalidPages) await assert.rejects(getMyOrders({ auth: { request: async () => result } }))
})

test('aborted listing cannot continue to hydrate orders', async () => {
  const controller = new AbortController()
  const auth = { request: async path => { assert.match(path, /proposals/); controller.abort(); return page() } }
  await assert.rejects(getMyOrders({ auth, signal: controller.signal }), { name: 'AbortError' })
})

test('summary uses API counters and rejects negative or inconsistent counters', async () => {
  const auth = { request: async path => { assert.equal(path, '/api/v1/provider/summary'); return summary() } }
  assert.equal((await getProviderSummary({ auth })).compatibleOpenOrders, 4)
  for (const result of [{ ...summary(), compatibleOpenOrders: -1 }, { ...summary(), proposals: { ...summary().proposals, total: 99 } }]) {
    await assert.rejects(getProviderSummary({ auth: { request: async () => result } }))
  }
})

test('unrelated chat drafts remain local and handle unavailable browser storage', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const values = new Map()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) } })
  try {
    saveChatDraft(id, 'Rascunho')
    assert.equal(loadChatDraft(id), 'Rascunho')
    assert.equal(loadChatDraft(otherId), '')
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous)
    else delete globalThis.localStorage
  }
})
