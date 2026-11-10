import assert from 'node:assert/strict'
import test from 'node:test'
import { createProviderDataCache, providerDataScope } from '../src/services/providerDataCache.js'
import { getCurrentLocation, getScreenPath, handleInternalLink } from '../src/services/navigation.js'

function browser(t, start = 'http://localhost:5173/home') {
  const previous = globalThis.window
  let url = new URL(start)
  const events = new EventTarget()
  const history = []
  Object.assign(events, {
    get location() { return url },
    history: { pushState: (_state, _title, href) => { history.push(href); url = new URL(href, url) } },
    scrollTo() {},
  })
  // Object.assign copies accessor values; expose the changing URL through an accessor.
  Object.defineProperty(events, 'location', { get: () => url })
  globalThis.window = events
  t.after(() => { globalThis.window = previous })
  return { events, history }
}
function click(href, changes = {}) {
  let prevented = false
  const attrs = new Set()
  const link = { target: '', hasAttribute: key => attrs.has(key), getAttribute: () => href }
  return { event: { button: 0, target: { closest: () => link }, preventDefault: () => { prevented = true }, ...changes }, attrs, link, prevented: () => prevented }
}

test('internal navigation changes history without full reload, including query-only order changes', t => {
  const b = browser(t)
  let notifications = 0
  b.events.addEventListener('popstate', () => notifications++)
  for (const href of ['/pedidos', '/pedidos/detalhes?id=first', '/pedidos/detalhes?id=second']) {
    const c = click(href)
    handleInternalLink(c.event, () => true)
    assert.equal(c.prevented(), true)
    assert.equal(getCurrentLocation(), href)
  }
  assert.equal(notifications, 3)
  assert.equal(b.history.length, 3)
})

test('new tabs, downloads, external links, fragments and already-handled clicks retain native behavior', t => {
  const b = browser(t)
  const cases = [click('/pedidos', { ctrlKey: true }), click('/pedidos', { metaKey: true }), click('/pedidos', { shiftKey: true }), click('/pedidos', { button: 1 }), click('/pedidos', { defaultPrevented: true }), click('https://example.com/home'), click('#section'), click('mailto:a@example.invalid')]
  const target = click('/pedidos'); target.link.target = '_blank'; cases.push(target)
  const download = click('/pedidos'); download.attrs.add('download'); cases.push(download)
  const full = click('/pedidos'); full.attrs.add('data-full-navigation'); cases.push(full)
  for (const c of cases) { handleInternalLink(c.event, () => true); assert.equal(c.prevented(), false) }
  const unknown = click('/api/v1/especialidades')
  handleInternalLink(unknown.event, () => false)
  assert.equal(unknown.prevented(), false)
  assert.equal(b.history.length, 0)
})

test('screen mapping preserves password recovery and resolves query strings independently', () => {
  assert.equal(getScreenPath('/login#recuperar-senha'), '/recuperar-senha')
  assert.equal(getScreenPath('/#recuperar-senha'), '/recuperar-senha')
  assert.equal(getScreenPath('/pedidos/detalhes?id=one'), '/pedidos/detalhes')
  assert.equal(getScreenPath('/oportunidades/'), '/oportunidades')
})

test('private cache has a short lifetime, isolates account/filter scopes and rejects late writes after invalidation', () => {
  let time = 100
  const cache = createProviderDataCache({ now: () => time })
  const originalEpoch = cache.epoch
  cache.write('account-a', 'orders', [{ id: 'real' }], originalEpoch)
  assert.equal(cache.read('account-a', 'orders').fresh, true)
  assert.equal(cache.read('account-b', 'orders'), null)
  assert.equal(cache.read('account-a', 'another-filter'), null)
  time += 30_000
  assert.equal(cache.read('account-a', 'orders').fresh, false)
  assert.deepEqual(cache.read('account-a', 'orders').data, [{ id: 'real' }])
  cache.clear()
  cache.write('account-a', 'orders', ['obsolete response'], originalEpoch)
  assert.equal(cache.read('account-a', 'orders'), null)
})

test('another login of the same user and professional filter edits have different cache scopes', () => {
  const session = { sessionId: 'one-login', user: { id: 'same-user' }, profile: { cidadeAtuacao: 'Fortaleza', ufAtuacao: 'CE', especialidades: ['eletrica'] } }
  const scope = providerDataScope(session)
  assert.notEqual(scope, providerDataScope({ ...session, sessionId: 'new-login' }))
  assert.notEqual(scope, providerDataScope({ ...session, profile: { ...session.profile, cidadeAtuacao: 'Caucaia' } }))
  assert.notEqual(scope, providerDataScope({ ...session, profile: { ...session.profile, especialidades: ['pintura'] } }))
})
