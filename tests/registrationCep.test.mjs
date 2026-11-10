import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'
import React, { act } from 'react'
import { create } from 'react-test-renderer'
import { createServer } from 'vite'

const address = {
  cep: '01001-000', logradouro: 'Praça da Sé', complemento: 'lado ímpar', unidade: '',
  bairro: 'Sé', localidade: 'São Paulo', uf: 'SP', estado: 'São Paulo', regiao: 'Sudeste',
  ibge: '3550308', gia: '1004', ddd: '11', siafi: '7107',
}
const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { 'Content-Type': 'application/json' },
})
let server
let RegisterPage

before(async () => {
  server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } })
  RegisterPage = (await server.ssrLoadModule('/src/pages/Cadastro/index.jsx')).default
})
after(async () => { await server?.close() })

async function registration(t, viaCep = async () => json(address)) {
  const previous = { window: globalThis.window, document: globalThis.document, fetch: globalThis.fetch, act: globalThis.IS_REACT_ACT_ENVIRONMENT }
  let renderer
  const lookups = []
  const registrations = []
  globalThis.window = { scrollTo() {}, location: { assign() {} } }
  globalThis.document = { title: '', getElementById: () => null }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/api/v1/especialidades')) return json([{ codigo: 'eletrica', nome: 'Elétrica' }])
    if (url.endsWith('/api/v1/auth/register-provider')) {
      const body = JSON.parse(options.body)
      registrations.push(body)
      return json({
        ...body, idUsuario: '11111111-1111-4111-8111-111111111111',
        createdAt: '2026-11-06T12:00:00Z',
      }, 201)
    }
    assert.match(url, /^https:\/\/viacep\.com\.br\/ws\/[0-9]{8}\/json\/$/)
    lookups.push({ url, options })
    return viaCep(url, options)
  }
  t.after(async () => {
    if (renderer) await act(() => renderer.unmount())
    t.mock.timers.reset()
    globalThis.window = previous.window
    globalThis.document = previous.document
    globalThis.fetch = previous.fetch
    globalThis.IS_REACT_ACT_ENVIRONMENT = previous.act
  })
  await act(async () => { renderer = create(React.createElement(RegisterPage)) })
  const field = (name) => {
    const node = renderer.root.findAll((item) => ['input', 'select', 'textarea'].includes(item.type) && item.props.name === name)[0]
    assert.ok(node, `Expected the registration field ${name}`)
    return node
  }
  const change = async (name, value) => { await act(async () => { field(name).props.onChange({ target: { name, value } }) }) }
  const submit = async () => { await act(async () => { await renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }) }) }
  const nextButton = () => renderer.root.findAllByType('button').find((node) => node.props.type === 'submit')
  for (const [name, value] of Object.entries({
    name: 'Cadastro de teste', email: 'cep@example.invalid', telefone: '85999990000',
    cpf: '11144477735', password: 'senha-sintetica', passwordConfirmation: 'senha-sintetica',
  })) await change(name, value)
  await submit()
  field('cep')
  const professional = async () => {
    await change('nomeExibicao', 'Profissional de teste')
    await act(() => renderer.root.findAllByType('button').find((node) => node.props.className?.includes('category-card')).props.onClick())
  }
  return { renderer, field, change, submit, nextButton, professional, lookups, registrations }
}

test('step 2 looks up a complete CEP and sends the resulting city and UF in the existing registration contract', async (t) => {
  const page = await registration(t)
  await page.change('cep', '0100100')
  assert.equal(page.lookups.length, 0, 'incomplete CEP must not query ViaCEP')
  await page.change('cep', '01001000')
  assert.equal(page.field('cep').props.value, '01001-000')
  assert.equal(page.lookups[0].url, 'https://viacep.com.br/ws/01001000/json/')
  assert.equal(page.lookups[0].options.credentials, 'omit')
  assert.equal(page.lookups[0].options.headers.Authorization, undefined)
  assert.equal(page.field('cidadeAtuacao').props.value, 'São Paulo')
  assert.equal(page.field('ufAtuacao').props.value, 'SP')
  assert.ok(!page.field('cidadeAtuacao').props.readOnly && !page.field('ufAtuacao').props.disabled)
  await page.professional()
  await page.submit()
  await page.submit()
  assert.equal(page.registrations.length, 1)
  assert.equal(page.registrations[0].cidadeAtuacao, 'São Paulo')
  assert.equal(page.registrations[0].ufAtuacao, 'SP')
  assert.equal(Object.hasOwn(page.registrations[0], 'cep'), false, 'CEP is only a frontend lookup aid')
})

test('a late response for a replaced or cleared CEP cannot overwrite the current address', async (t) => {
  const pending = []
  const page = await registration(t, () => new Promise((resolve) => pending.push(resolve)))
  await page.professional()
  await page.change('cep', '01001-000')
  assert.equal(page.nextButton().props.disabled, true)
  await page.submit()
  assert.ok(page.field('cep'), 'Enter cannot advance while the lookup is pending')
  await page.change('cep', '20040002')
  assert.equal(page.lookups[0].options.signal.aborted, true)
  await act(async () => { pending[1](json({ ...address, cep: '20040-002', localidade: 'Rio de Janeiro', uf: 'RJ' })) })
  await act(async () => { pending[0](json(address)) })
  assert.equal(page.field('cidadeAtuacao').props.value, 'Rio de Janeiro')
  assert.equal(page.field('ufAtuacao').props.value, 'RJ')
  assert.equal(page.nextButton().props.disabled, false)
  await page.change('cep', '01001000')
  await page.change('cep', '')
  await act(async () => { pending[2](json(address)) })
  assert.equal(page.field('cidadeAtuacao').props.value, 'Rio de Janeiro')
  assert.equal(page.field('ufAtuacao').props.value, 'RJ')
})

test('manual address edits cancel a pending lookup and survive its late response', async (t) => {
  let release
  const page = await registration(t, () => new Promise((resolve) => { release = resolve }))
  await page.change('cep', '01001000')
  await page.change('cidadeAtuacao', 'Fortaleza')
  await page.change('ufAtuacao', 'CE')
  assert.equal(page.lookups[0].options.signal.aborted, true)
  await act(async () => { release(json(address)) })
  assert.equal(page.field('cidadeAtuacao').props.value, 'Fortaleza')
  assert.equal(page.field('ufAtuacao').props.value, 'CE')
  assert.equal(page.nextButton().props.disabled, false)
})

for (const [failure, reply] of [
  ['missing CEP', async () => json({ erro: true })],
  ['string missing-CEP flag', async () => json({ erro: 'true' })],
  ['invalid address', async () => json({ ...address, uf: 'ZZ' })],
  ['network failure', async () => { throw new TypeError('Network unavailable') }],
  ['HTTP failure', async () => json({}, 503)],
]) {
  test(`${failure} shows feedback and allows registration with a manually entered city and UF`, async (t) => {
    const page = await registration(t, reply)
    await page.change('cidadeAtuacao', 'Fortaleza')
    await page.change('ufAtuacao', 'CE')
    await page.change('cep', '01001000')
    assert.equal(page.field('cep').props['aria-invalid'], true)
    const message = page.renderer.root.findByProps({ id: 'register-cep-message' })
    assert.match(message.children.join(''), /manualmente/i)
    assert.equal(page.field('cidadeAtuacao').props.value, 'Fortaleza')
    assert.equal(page.field('ufAtuacao').props.value, 'CE')
    assert.equal(page.nextButton().props.disabled, false)
    await page.professional()
    await page.submit()
    await page.submit()
    assert.equal(page.registrations[0].cidadeAtuacao, 'Fortaleza')
    assert.equal(page.registrations[0].ufAtuacao, 'CE')
  })
}

test('incomplete CEP has feedback and can be cleared to continue with manual address entry', async (t) => {
  const page = await registration(t)
  await page.professional()
  await page.change('cidadeAtuacao', 'Fortaleza')
  await page.change('ufAtuacao', 'CE')
  await page.change('cep', '01001')
  await act(() => page.field('cep').props.onBlur())
  assert.equal(page.field('cep').props['aria-invalid'], true)
  await page.submit()
  assert.ok(page.field('cep'))
  assert.equal(page.lookups.length, 0)
  await page.change('cep', '')
  await page.submit()
  await page.submit()
  assert.equal(page.registrations[0].cidadeAtuacao, 'Fortaleza')
})

test('a timed-out lookup releases the form for manual address entry', async (t) => {
  const page = await registration(t, (url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
  }))
  t.mock.timers.enable({ apis: ['setTimeout'] })
  await page.change('cep', '01001000')
  assert.equal(page.nextButton().props.disabled, true)
  await act(async () => { t.mock.timers.tick(10000) })
  assert.equal(page.lookups[0].options.signal.aborted, true)
  assert.equal(page.nextButton().props.disabled, false)
  assert.match(page.renderer.root.findByProps({ id: 'register-cep-message' }).children.join(''), /manualmente/i)
})

test('leaving step 2 or unmounting aborts the lookup', async (t) => {
  const pending = []
  const page = await registration(t, () => new Promise((resolve) => pending.push(resolve)))
  await page.change('cep', '01001000')
  await act(() => page.renderer.root.findAllByType('button').find((node) => node.props.className === 'register-secondary-button').props.onClick())
  assert.equal(page.lookups[0].options.signal.aborted, true)
  await act(async () => { pending[0](json(address)) })
  await page.submit()
  assert.equal(page.field('cidadeAtuacao').props.value, '')
  await page.change('cep', '20040002')
  await act(() => page.renderer.unmount())
  assert.equal(page.lookups[1].options.signal.aborted, true)
  await act(async () => { pending[1](json({ ...address, cep: '20040-002', localidade: 'Rio de Janeiro', uf: 'RJ' })) })
})
