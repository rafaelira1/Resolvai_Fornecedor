import assert from 'node:assert/strict'
import test from 'node:test'
import { createProviderDataCache } from '../src/services/providerDataCache.js'
import { providerCacheKeys, validProviderCacheData } from '../src/services/providerCacheData.js'

function storage() {
  const values = new Map()
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
}
const key = 'resolvai:provider-data:v1'
const order = { id: '20000000-0000-4000-8000-000000000001', proposalId: '30000000-0000-4000-8000-000000000001',
  title: 'Pedido confirmado', customer: 'Maria', location: 'Fortaleza', status: 'accepted', value: 150,
  deadline: '3 dias', guarantee: '90 dias', scope: 'Escopo', proposalDescription: '', createdAt: '2026-11-09T12:00:00Z' }

test('screen results survive reconstruction, share detail records and expire without becoming false empty results', () => {
  const saved = storage()
  let time = 1_000_000
  const options = { storage: saved, validate: validProviderCacheData, ttlMs: 300_000, now: () => time }
  const first = createProviderDataCache(options)
  first.write('login-a', providerCacheKeys.orders, [order], first.epoch)
  const restored = createProviderDataCache(options)
  assert.deepEqual(restored.read('login-a', providerCacheKeys.orders).data, [order])
  assert.deepEqual(restored.read('login-a', providerCacheKeys.order(order.id)).data, order)
  assert.equal(restored.read('login-b', providerCacheKeys.orders), null)
  time += 300_000
  assert.equal(restored.read('login-a', providerCacheKeys.orders).fresh, false)
  assert.deepEqual(restored.read('login-a', providerCacheKeys.orders).data, [order], 'stale data is available for background refresh')
  time += 30 * 60_000
  assert.equal(restored.read('login-a', providerCacheKeys.orders), null)
})

test('clear removes persisted private data and cannot be undone by an obsolete response', () => {
  const saved = storage()
  const cache = createProviderDataCache({ storage: saved, validate: validProviderCacheData })
  cache.write('login-a', providerCacheKeys.orders, [order], cache.epoch)
  const epoch = cache.epoch
  cache.clear()
  cache.write('login-a', providerCacheKeys.orders, [order], epoch)
  assert.equal(saved.getItem(key), null)
  assert.equal(createProviderDataCache({ storage: saved }).read('login-a', providerCacheKeys.orders), null)
})

test('malformed, future, expired, unsupported and invalid response shapes are never restored', () => {
  const saved = storage()
  const now = 1_000_000
  for (const value of ['{bad', JSON.stringify({ version: 99, rows: [] }), JSON.stringify({ version: 1, rows: [
    { scope: 'a', key: providerCacheKeys.orders, at: now, data: { fake: 'not an array' } },
    { scope: 'a', key: providerCacheKeys.order(order.id), at: now, data: { ...order, status: 'paid' } },
    { scope: 'a', key: 'password', at: now, data: { password: 'must not be restored' } },
    { scope: 'a', key: providerCacheKeys.summary, at: now + 1, data: {} },
    { scope: 'a', key: providerCacheKeys.categories, at: now - 1_800_001, data: [] },
  ] })]) {
    saved.setItem(key, value)
    const cache = createProviderDataCache({ storage: saved, now: () => now, validate: validProviderCacheData })
    assert.equal(cache.read('a', providerCacheKeys.orders), null)
    assert.equal(cache.read('a', providerCacheKeys.order(order.id)), null)
    assert.equal(cache.read('a', 'password'), null)
  }
})

test('storage exceptions do not break in-memory caching or navigation', () => {
  const unavailable = { getItem() { throw Error('blocked') }, setItem() { throw Error('quota') }, removeItem() { throw Error('blocked') } }
  const cache = createProviderDataCache({ storage: unavailable })
  cache.write('a', 'orders', [order], cache.epoch)
  assert.deepEqual(cache.read('a', 'orders').data, [order])
  assert.doesNotThrow(() => cache.clear())
})

test('only known read data is persisted, and profile confirmation retains only the matching professional scope', () => {
  const saved = storage()
  const cache = createProviderDataCache({ storage: saved, validate: validProviderCacheData })
  cache.write('correct-profile', providerCacheKeys.orders, [order], cache.epoch)
  cache.write('obsolete-profile', providerCacheKeys.orders, [], cache.epoch)
  cache.write('correct-profile', 'auth-session', { accessToken: 'private-token', password: 'private-password' }, cache.epoch)
  cache.retainScope('correct-profile')
  assert.equal(cache.read('obsolete-profile', providerCacheKeys.orders), null)
  assert.ok(cache.read('correct-profile', providerCacheKeys.orders))
  assert.doesNotMatch(saved.getItem(key), /private-token|private-password|auth-session/)
})
