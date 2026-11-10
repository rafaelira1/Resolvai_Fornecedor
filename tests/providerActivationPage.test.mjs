import assert from 'node:assert/strict'
import test from 'node:test'
import React, { act } from 'react'
import { create } from 'react-test-renderer'
import { createServer } from 'vite'

const key = 'resolvai:provider-session:v1'
const id = '11111111-1111-4111-8111-111111111111'
const saved = { sessionId: 'activation-test', accessToken: 'existing-account', tokenType: 'bearer',
  expiresAtUtc: '2099-01-01T00:00:00Z', providerProfileStatus: 'pending',
  user: { id, role: 'Cliente', isActive: true, name: 'Cliente Original', email: 'cliente@example.invalid', cpf: '52998224725' } }
function storage(value) {
  const data = new Map(value ? [[key, JSON.stringify(value)]] : [])
  return { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) }
}
async function application(t, initialPath = '/ativar-fornecedor') {
  const previous = { window: globalThis.window, document: globalThis.document, fetch: globalThis.fetch, act: globalThis.IS_REACT_ACT_ENVIRONMENT }
  let renderer
  let location = new URL(initialPath, 'http://localhost:5173')
  const events = Object.assign(new EventTarget(), { localStorage: storage(), sessionStorage: storage(saved), scrollTo() {} })
  Object.defineProperty(events, 'location', { get: () => location })
  events.history = { replaceState(_state, _title, href) { location = new URL(href, location) }, pushState(_state, _title, href) { location = new URL(href, location) } }
  globalThis.window = events
  globalThis.document = { title: '', getElementById: () => null }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const calls = []
  globalThis.fetch = async (path, options) => {
    calls.push({ path, options })
    if (path.endsWith('/especialidades')) return Response.json([{ codigo: 'eletrica', nome: 'Elétrica' }])
    assert.equal(path, '/api/v1/fornecedores/me/complete-registration')
    assert.equal(options.headers.Authorization, 'Bearer existing-account')
    const body = JSON.parse(options.body)
    return Response.json({ ...body, idUsuario: id, name: saved.user.name, email: saved.user.email, cpf: saved.user.cpf,
      cnpj: null, bio: null, registroProfissional: null, createdAt: '2026-11-01T12:00:00Z', updatedAt: null }, { status: 201 })
  }
  const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } })
  t.after(async () => {
    if (renderer) await act(() => renderer.unmount())
    await server.close()
    globalThis.window = previous.window
    globalThis.document = previous.document
    globalThis.fetch = previous.fetch
    globalThis.IS_REACT_ACT_ENVIRONMENT = previous.act
  })
  const { default: Guard } = await server.ssrLoadModule('/src/components/ProviderGuard.jsx')
  const { default: Register } = await server.ssrLoadModule('/src/pages/Cadastro/index.jsx')
  await act(async () => { renderer = create(React.createElement(Guard, null, React.createElement(Register, { activation: true }))) })
  const field = name => renderer.root.findAll(n => ['input', 'select', 'textarea'].includes(n.type) && n.props.name === name)[0]
  const change = async (name, value) => act(async () => field(name).props.onChange({ target: { name, value } }))
  const submit = async () => act(async () => renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }))
  return { renderer, field, change, submit, calls, events }
}

test('activation screen reuses customer identity, omits passwords and completes all three steps with the existing account', async t => {
  const page = await application(t)
  assert.equal(page.field('name').props.value, saved.user.name)
  assert.equal(page.field('name').props.readOnly, true)
  assert.equal(page.field('email').props.value, saved.user.email)
  assert.equal(page.field('email').props.readOnly, true)
  assert.equal(page.field('cpf').props.readOnly, true)
  assert.equal(page.field('password'), undefined)
  assert.equal(page.field('passwordConfirmation'), undefined)
  await page.change('tipoPessoa', 'PJ')
  await page.change('tipoPessoa', 'PF')
  assert.equal(page.field('cpf').props.value, '529.982.247-25')
  await page.change('telefone', '85999997777')
  await page.submit()
  await page.change('nomeExibicao', 'Profissional Teste')
  await page.change('cidadeAtuacao', 'Fortaleza')
  await page.change('ufAtuacao', 'CE')
  await act(() => page.renderer.root.findAllByType('button').find(n => n.props.className?.includes('category-card')).props.onClick())
  await page.submit()
  const button = page.renderer.root.findAllByType('button').find(n => n.props.type === 'submit')
  assert.ok(button.children.includes('Ativar perfil de fornecedor'))
  await page.submit()
  const writes = page.calls.filter(c => c.options.method === 'POST')
  assert.equal(writes.length, 1)
  const body = JSON.parse(writes[0].options.body)
  assert.equal(body.nomeExibicao, 'Profissional Teste')
  for (const field of ['email', 'password', 'role', 'idUsuario']) assert.equal(Object.hasOwn(body, field), false)
  assert.equal(page.events.location.pathname, '/home')
  const session = JSON.parse(page.events.sessionStorage.getItem(key))
  assert.equal(session.user.id, id)
  assert.equal(session.user.role, 'Cliente')
  assert.equal(session.providerProfileStatus, 'active')
})

test('direct access to the dashboard with a pending profile redirects to activation without loading protected data', async t => {
  const page = await application(t, '/home')
  assert.equal(page.events.location.pathname, '/ativar-fornecedor')
  assert.deepEqual(page.calls, [])
})
