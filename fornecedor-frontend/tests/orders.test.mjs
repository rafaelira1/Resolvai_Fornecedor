import assert from 'node:assert/strict'
import test from 'node:test'
import { orders, requestOrderCompletion, restoreOrders } from '../src/data/orders.js'
import { loadOrders, saveOrder, loadChatDraft, saveChatDraft } from '../src/services/orders.js'

test('provider completion waits for the customer and does not release the payment', () => {
  const requestedAt = '2026-09-30T21:00:00.000Z'
  const updated = requestOrderCompletion(orders[0], requestedAt)
  assert.equal(updated.status, 'awaiting_confirmation')
  assert.equal(updated.completionRequestedAt, requestedAt)
  assert.equal(orders[0].status, 'in_progress')
  assert.equal(updated.value, 1850)
})

test('repeated completion requests keep the first request; completed orders stay completed', () => {
  const pending = requestOrderCompletion(orders[0], '2026-09-30T21:00:00.000Z')
  assert.deepEqual(requestOrderCompletion(pending, '2026-10-01T12:00:00.000Z'), pending)
  assert.deepEqual(requestOrderCompletion(orders[2]), orders[2])
})

test('restores pending orders without changing another order or trusting client-side payment state', () => {
  const restored = restoreOrders({
    1: { status: 'awaiting_confirmation', completionRequestedAt: '2026-09-30T21:00:00.000Z', value: 0 },
    2: { status: 'completed', value: 0 },
    3: { status: 'in_progress' },
  })
  assert.equal(restored[0].status, 'awaiting_confirmation')
  assert.equal(restored[0].value, 1850)
  assert.equal(restored[1].status, 'in_progress')
  assert.equal(restored[2].status, 'completed')
})

test('missing, malformed and invalid saved state falls back to the initial orders', () => {
  for (const saved of [null, undefined, [], 'invalid', { 1: { status: 'awaiting_confirmation', completionRequestedAt: 'invalid' } }]) {
    assert.deepEqual(restoreOrders(saved), orders)
  }
})

test('order status and chat drafts persist independently and storage errors are handled', () => {
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const values = new Map()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  } })
  try {
    assert.deepEqual(loadOrders(), orders)
    saveOrder(requestOrderCompletion(orders[0], '2026-09-30T21:00:00.000Z'))
    saveOrder(requestOrderCompletion(orders[1], '2026-09-30T22:00:00.000Z'))
    assert.deepEqual(loadOrders().map((order) => order.status), ['awaiting_confirmation', 'awaiting_confirmation', 'completed'])
    saveChatDraft('1', 'Podemos combinar a vistoria?')
    assert.equal(loadChatDraft('1'), 'Podemos combinar a vistoria?')
    assert.equal(loadChatDraft('2'), '')
    assert.equal(loadOrders()[0].status, 'awaiting_confirmation')

    values.set('resolvai:orders:v1', '{malformed')
    assert.deepEqual(loadOrders(), orders)
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
      getItem() { throw new Error('Storage unavailable') },
      setItem() { throw new Error('Storage unavailable') },
    } })
    assert.deepEqual(loadOrders(), orders)
    assert.equal(loadChatDraft('1'), '')
    assert.throws(() => saveOrder(requestOrderCompletion(orders[0])), /Storage unavailable/)
    assert.throws(() => saveChatDraft('1', 'Rascunho'), /Storage unavailable/)
  } finally {
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage)
    else delete globalThis.localStorage
  }
})
