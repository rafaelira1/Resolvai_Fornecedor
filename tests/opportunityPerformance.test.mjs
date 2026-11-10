import assert from 'node:assert/strict'
import test from 'node:test'
import { createProviderDataCache } from '../src/services/providerDataCache.js'
import { providerCacheKeys as keys } from '../src/services/providerCacheData.js'
import { deriveOpportunityPage } from '../src/services/opportunitySnapshot.js'

const item = (id, specialtyCode, title, proposalsCount) => ({ id, specialtyCode, title, category: specialtyCode === 'eletrica' ? 'Elétrica' : 'Hidráulica', location: 'Fortaleza - CE', proposalsCount, createdAt: '2026-11-09T12:00:00Z' })
const first = item('one', 'eletrica', 'Reparo 100% elétrico', 3)
const second = item('two', 'hidraulica', 'Troca de cano', 0)
const third = item('three', 'eletrica', 'Reparo da tomada', 3)
const snapshot = { at: 100, data: { items: [first, second, third], page: 1, pageSize: 10, totalItems: 3, totalPages: 1, specialties: [] } }
const entries = [[keys.opportunities(), snapshot]]

test('complete authorized snapshot supports instant category, literal search, sort and pagination', () => {
  const derived = deriveOpportunityPage(keys.opportunities({ category: 'eletrica', search: 'ELETRICA', sort: 'proposals', pageSize: 1 }), entries)
  assert.deepEqual(derived.data.items, [first])
  assert.equal(derived.data.totalItems, 2)
  assert.equal(derived.data.totalPages, 2)
  assert.equal(derived.at, 100, 'derivation does not extend freshness')
  const next = deriveOpportunityPage(keys.opportunities({ category: 'eletrica', sort: 'proposals', page: 2, pageSize: 1 }), entries)
  assert.deepEqual(next.data.items, [third], 'equal counts preserve server order')
  assert.deepEqual(deriveOpportunityPage(keys.opportunities({ search: '100%' }), entries).data.items, [first])
  assert.equal(deriveOpportunityPage(keys.opportunities({ search: 'nada' }), entries).data.totalItems, 0)
})

test('partial pages and filtered pages cannot masquerade as the complete feed', () => {
  assert.equal(deriveOpportunityPage(keys.opportunities({ category: 'eletrica' }), [[keys.opportunities(), { ...snapshot, data: { ...snapshot.data, totalItems: 20 } }]]), null)
  assert.equal(deriveOpportunityPage(keys.opportunities(), [[keys.opportunities({ category: 'eletrica' }), snapshot]]), null)
  for (const key of ['opportunities:null', 'opportunities:{}', 'opportunities:{"search":{}}']) assert.equal(deriveOpportunityPage(key, entries), null)
})

test('two consumers share a single network operation and cancellation only releases its own consumer', async () => {
  const cache = createProviderDataCache()
  let release, calls = 0, networkSignal
  const load = ({ signal }) => { calls++; networkSignal = signal; return new Promise(resolve => { release = resolve }) }
  const a = new AbortController(), b = new AbortController()
  const first = cache.fetch('account', 'detail', load, { signal: a.signal })
  const second = cache.fetch('account', 'detail', load, { signal: b.signal })
  await Promise.resolve()
  a.abort()
  await assert.rejects(first, { name: 'AbortError' })
  assert.equal(networkSignal.aborted, false)
  release({ title: 'confirmed' })
  assert.deepEqual(await second, { title: 'confirmed' })
  assert.equal(calls, 1)
  assert.deepEqual(cache.read('account', 'detail').data, { title: 'confirmed' })
})

test('logout aborts shared work and prevents a late response from restoring private cache', async () => {
  const cache = createProviderDataCache()
  let release
  const pending = cache.fetch('old-login', 'detail', () => new Promise(resolve => { release = resolve }))
  await Promise.resolve()
  cache.clear()
  release({ title: 'obsolete' })
  await assert.rejects(pending, { name: 'AbortError' })
  assert.equal(cache.read('old-login', 'detail'), null)
})

test('a complete snapshot is scoped to its account and fresh derived filters need no network', async () => {
  let now = 100
  const cache = createProviderDataCache({ now: () => now })
  cache.write('account-a', keys.opportunities(), snapshot.data, cache.epoch)
  const filtered = keys.opportunities({ category: 'hidraulica' })
  const result = await cache.fetch('account-a', filtered, () => assert.fail('no network for a complete, fresh snapshot'))
  assert.deepEqual(result.items, [second])
  assert.equal(cache.read('account-b', filtered), null)
  now += 30_001
  assert.equal(cache.read('account-a', filtered).fresh, false)
})
