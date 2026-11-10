import assert from 'node:assert/strict'
import test from 'node:test'
import React, { act } from 'react'
import { create } from 'react-test-renderer'
import { createServer } from 'vite'

const key = 'resolvai:provider-session:v1'
const id = '11111111-1111-4111-8111-111111111111'
const instant = Date.parse('2026-11-05T12:00:00Z')
const token = (changes = {}) => ({ accessToken: 'first', refreshToken: 'refresh', tokenType: 'Bearer', expiresAtUtc: new Date(instant + 1000).toISOString(), user: { id, name: 'Synthetic', email: 'provider@example.invalid', role: 'Prestador', isActive: true }, ...changes })
const profile = { idUsuario: id, name: 'Synthetic', email: 'provider@example.invalid', telefone: '85999990000', cpf: '11144477735', tipoPessoa: 'PF', nomeExibicao: 'Synthetic', cnpj: null, cidadeAtuacao: 'Cidade teste', ufAtuacao: 'CE', raioAtendimentoKm: 20, bio: null, registroProfissional: null, especialidades: ['eletrica'], createdAt: '2026-11-01T12:00:00Z', updatedAt: null }
const json = (status, value) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
function store(value) {
  const data = new Map(value ? [[key, JSON.stringify(value)]] : [])
  return { getItem: (name) => data.get(name) ?? null, setItem: (name, item) => data.set(name, item), removeItem: (name) => data.delete(name) }
}

test('actual guard keeps the edited profile mounted through expiry and renewal, then removes it on refusal', async (t) => {
  const previous = { window: globalThis.window, document: globalThis.document, fetch: globalThis.fetch, act: globalThis.IS_REACT_ACT_ENVIRONMENT }
  let renderer
  let releaseRefresh
  let refusal = false
  let refreshes = 0
  let releaseSave
  const events = new EventTarget()
  Object.assign(events, { localStorage: store(token()), sessionStorage: store(), location: { replace() {} }, scrollTo() {} })
  globalThis.window = events
  globalThis.document = { title: '' }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/auth/refresh-provider')) {
      refreshes++
      return new Promise((resolve) => { releaseRefresh = () => resolve(json(200, token({ accessToken: 'renewed', expiresAtUtc: new Date(Date.now() + 9000).toISOString() }))) })
    }
    if (options.method === 'PATCH') return new Promise((resolve) => { releaseSave = () => resolve(json(200, { ...profile, ...JSON.parse(options.body) })) })
    if (url.endsWith('/especialidades')) return json(200, [{ codigo: 'eletrica', nome: 'Eletrica' }])
    return json(refusal ? 403 : 200, profile)
  }
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } })
  t.after(async () => {
    if (renderer) await act(() => renderer.unmount())
    t.mock.timers.reset()
    await server.close()
    globalThis.window = previous.window
    globalThis.document = previous.document
    globalThis.fetch = previous.fetch
    globalThis.IS_REACT_ACT_ENVIRONMENT = previous.act
  })
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: instant })
  const { default: Guard } = await server.ssrLoadModule('/src/components/ProviderGuard.jsx')
  const { default: Profile } = await server.ssrLoadModule('/src/pages/ProviderProfilePage.jsx')
  await act(async () => { renderer = create(React.createElement(Guard, null, React.createElement(Profile))) })
  const input = () => renderer.root.findAllByType('input').find((node) => node.props.name === 'nomeExibicao')
  const edit = renderer.root.findAllByType('button').find((node) => node.children.includes('Editar perfil'))
  await act(() => edit.props.onClick())
  await act(() => input().props.onChange({ target: { name: 'nomeExibicao', value: 'Unsaved draft' } }))
  assert.equal(input().props.readOnly, false)
  assert.equal(input().props.value, 'Unsaved draft')
  await act(async () => { t.mock.timers.tick(1001) })
  assert.equal(refreshes, 1)
  assert.ok(input(), 'editor remains mounted while refresh is pending')
  assert.equal(input().props.value, 'Unsaved draft')
  await act(async () => { releaseRefresh() })
  assert.equal(input().props.value, 'Unsaved draft')
  assert.equal(input().props.readOnly, false)
  // Exercise session.js's real browser event wiring, with a rotation belonging
  // to this same login. It must preserve the verified editor and its draft.
  const rotated = JSON.parse(events.localStorage.getItem(key))
  events.localStorage.setItem(key, JSON.stringify({ ...rotated, accessToken: 'other-tab-rotation' }))
  const event = new Event('storage')
  Object.assign(event, { key, storageArea: events.localStorage })
  await act(async () => events.dispatchEvent(event))
  assert.equal(input().props.value, 'Unsaved draft')
  assert.equal(input().props.readOnly, false)
  await act(async () => { renderer.root.findByType('form').props.onSubmit({ preventDefault() {}, currentTarget: { reportValidity: () => true } }) })
  assert.equal(renderer.root.findByType('form').props['aria-busy'], true)
  await act(async () => { t.mock.timers.tick(9000) })
  assert.equal(refreshes, 2)
  assert.equal(renderer.root.findByType('form').props['aria-busy'], true)
  await act(async () => { releaseRefresh() })
  assert.equal(renderer.root.findByType('form').props['aria-busy'], true)
  await act(async () => { releaseSave() })
  assert.equal(renderer.root.findByType('form').props['aria-busy'], false)
  assert.equal(input().props.value, 'Unsaved draft')
  assert.equal(input().props.readOnly, true)
  refusal = true
  await act(async () => { t.mock.timers.tick(9000) })
  assert.equal(refreshes, 3)
  await act(async () => { releaseRefresh() })
  assert.equal(renderer.root.findAllByType(Profile).length, 0)
})

test('initial and replaced identities stay gated until their own profile verifies; stale old verification cannot unlock them', async (t) => {
  const previous = { window: globalThis.window, document: globalThis.document, fetch: globalThis.fetch, act: globalThis.IS_REACT_ACT_ENVIRONMENT }
  let renderer
  const pending = []
  const events = new EventTarget()
  Object.assign(events, { localStorage: store(token({ sessionId: 'old-login' })), sessionStorage: store(), location: { replace() {} }, scrollTo() {} })
  globalThis.window = events
  globalThis.document = { title: '' }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  globalThis.fetch = async (url) => url.endsWith('/especialidades') ? json(200, [{ codigo: 'eletrica', nome: 'Eletrica' }]) : new Promise((resolve) => pending.push((value) => resolve(json(200, value))))
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } })
  t.after(async () => {
    if (renderer) await act(() => renderer.unmount())
    t.mock.timers.reset()
    await server.close()
    globalThis.window = previous.window
    globalThis.document = previous.document
    globalThis.fetch = previous.fetch
    globalThis.IS_REACT_ACT_ENVIRONMENT = previous.act
  })
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: instant })
  const { default: Guard } = await server.ssrLoadModule('/src/components/ProviderGuard.jsx')
  const { default: Profile } = await server.ssrLoadModule('/src/pages/ProviderProfilePage.jsx')
  await act(async () => { renderer = create(React.createElement(Guard, null, React.createElement(Profile))) })
  assert.equal(renderer.root.findAllByType(Profile).length, 0)
  const newId = '22222222-2222-4222-8222-222222222222'
  const replace = async (value) => {
    events.localStorage.setItem(key, JSON.stringify(value))
    const event = new Event('storage')
    Object.assign(event, { key, storageArea: events.localStorage })
    await act(async () => events.dispatchEvent(event))
  }
  await replace(token({ sessionId: 'new-login', accessToken: 'new-account', user: { ...token().user, id: newId } }))
  assert.equal(pending.length, 2)
  await act(async () => { pending[0](profile) })
  assert.equal(renderer.root.findAllByType(Profile).length, 0)
  await act(async () => { pending[1]({ ...profile, idUsuario: newId, nomeExibicao: 'New account' }) })
  const input = () => renderer.root.findAllByType('input').find((node) => node.props.name === 'nomeExibicao')
  assert.equal(input().props.value, 'New account')
  const edit = renderer.root.findAllByType('button').find((node) => node.children.includes('Editar perfil'))
  await act(() => edit.props.onClick())
  await act(() => input().props.onChange({ target: { name: 'nomeExibicao', value: 'Obsolete draft' } }))
  // Even the same user logging in anew must verify again and remount the editor.
  await replace(token({ sessionId: 'newer-login', accessToken: 'same-user-new-login', user: { ...token().user, id: newId } }))
  assert.equal(renderer.root.findAllByType(Profile).length, 0)
  await act(async () => { pending[2]({ ...profile, idUsuario: newId, nomeExibicao: 'Confirmed again' }) })
  assert.equal(input().props.value, 'Confirmed again')
  assert.equal(input().props.readOnly, true)
})
