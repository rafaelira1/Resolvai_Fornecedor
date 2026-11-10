import assert from 'node:assert/strict'
import test from 'node:test'
import React, { act } from 'react'
import { create } from 'react-test-renderer'
import { createServer } from 'vite'

const providerId = '10000000-0000-4000-8000-000000000001'
const id = '20000000-0000-4000-8000-000000000001'
const secondId = '20000000-0000-4000-8000-000000000002'
const item = { id, title: 'Pedido real elétrico', category: 'Elétrica', specialtyCode: 'eletrica', location: 'Fortaleza, CE', urgency: 'Urgente', createdAt: '2026-11-01T12:00:00Z', proposalsCount: 2 }
const page = (changes = {}) => ({ items: [item], page: 1, pageSize: 10, totalItems: 1, totalPages: 1, specialties: [{ codigo: 'eletrica', nome: 'Elétrica' }, { codigo: 'hidraulica', nome: 'Hidráulica' }], ...changes })
function storage(value) {
  const map = new Map(value ? [['resolvai:provider-session:v1', JSON.stringify(value)]] : [])
  return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) }
}

async function renderPage(t, fetcher, screen = 'OpportunitiesPage') {
  const previous = { window: globalThis.window, document: globalThis.document, fetch: globalThis.fetch, act: globalThis.IS_REACT_ACT_ENVIRONMENT }
  const events = new EventTarget()
  const session = { sessionId: 'professional-session', accessToken: 'test-token', refreshToken: 'refresh', tokenType: 'bearer', expiresAtUtc: '2099-01-01T00:00:00Z', user: { id: providerId, name: 'Teste', email: 'test@example.invalid', role: 'Prestador', isActive: true } }
  Object.assign(events, { localStorage: storage(), sessionStorage: storage(session), location: { search: `?id=${id}` } })
  globalThis.window = events
  globalThis.document = { title: '' }
  globalThis.fetch = fetcher
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } })
  let renderer
  t.after(async () => {
    if (renderer) await act(() => renderer.unmount())
    await server.close()
    globalThis.window = previous.window
    globalThis.document = previous.document
    globalThis.fetch = previous.fetch
    globalThis.IS_REACT_ACT_ENVIRONMENT = previous.act
  })
  const { authSession } = await server.ssrLoadModule('/src/services/session.js')
  authSession.setProfile({ idUsuario: providerId, name: 'Teste', email: 'test@example.invalid', nomeExibicao: 'Fornecedor teste', especialidades: ['eletrica', 'hidraulica'] })
  const { default: Page } = await server.ssrLoadModule(`/src/pages/${screen}.jsx`)
  await act(async () => { renderer = create(React.createElement(Page)) })
  const text = () => JSON.stringify(renderer.toJSON())
  const button = name => renderer.root.findAllByType('button').find(node => node.children.includes(name))
  const click = async name => { await act(async () => button(name).props.onClick()) }
  return { renderer, text, button, click, show: async screen => {
    const { default: Next } = await server.ssrLoadModule(`/src/pages/${screen}.jsx`)
    await act(async () => renderer.update(React.createElement(Next)))
  } }
}

test('feed renders real records and their UUID links, with server search, specialty filters and pagination', async t => {
  const calls = []
  const screen = await renderPage(t, async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer test-token')
    const query = new URL(url, 'http://test.invalid').searchParams
    calls.push(query)
    return Response.json(page({ items: query.get('page') === '2' ? [{ ...item, id: secondId, title: 'Pedido da segunda página' }] : [item], page: Number(query.get('page')), totalItems: 11, totalPages: 2 }))
  })
  assert.match(screen.text(), /Pedido real elétrico/)
  assert.equal(screen.renderer.root.findAllByType('a').find(node => node.children.includes('Ver Pedido')).props.href, `/oportunidades/detalhes?id=${id}`)
  assert.doesNotMatch(screen.text(), /89\.400|Infiltração no banheiro|Compatibilidade IA/)
  await screen.click('Próxima')
  assert.match(screen.text(), /Pedido da segunda página/)
  await screen.click('Hidráulica')
  assert.equal(calls.at(-1).get('page'), '1')
  assert.equal(calls.at(-1).get('category'), 'hidraulica')
  await act(async () => screen.renderer.root.findByProps({ type: 'search' }).props.onChange({ target: { value: 'Cidade teste' } }))
  await act(async () => screen.renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }))
  assert.equal(calls.at(-1).get('search'), 'Cidade teste')
})

test('loading, empty results and a failed request are distinct, with retry returning real records', async t => {
  let release
  let mode = 'pending'
  const screen = await renderPage(t, async () => {
    if (mode === 'pending') return new Promise(resolve => { release = resolve })
    return mode === 'error' ? Response.json({}, { status: 500 }) : Response.json(page())
  })
  assert.match(screen.text(), /Carregando oportunidades/)
  assert.doesNotMatch(screen.text(), /Nenhuma oportunidade encontrada/)
  await act(async () => release(Response.json(page({ items: [], totalItems: 0, totalPages: 0 }))))
  assert.match(screen.text(), /Nenhuma oportunidade encontrada/)
  mode = 'error'
  await screen.click('Atualizar')
  assert.ok(screen.renderer.root.findByProps({ role: 'alert' }))
  assert.doesNotMatch(screen.text(), /Nenhuma oportunidade encontrada/)
  mode = 'success'
  await screen.click('Tentar novamente')
  assert.match(screen.text(), /Pedido real elétrico/)
})

test('late responses from abandoned filters cannot replace the current specialty results', async t => {
  const pending = []
  const screen = await renderPage(t, async (url, options) => {
    return new Promise(resolve => pending.push({ resolve, signal: options.signal, url }))
  })
  await act(async () => screen.renderer.root.findByType('select').props.onChange({ target: { value: 'proposals' } }))
  assert.equal(pending.length, 2)
  assert.equal(pending[0].signal.aborted, true)
  await act(async () => pending[1].resolve(Response.json(page({ items: [{ ...item, title: 'Resultado atual' }] }))))
  await act(async () => pending[0].resolve(Response.json(page({ items: [{ ...item, title: 'Resultado obsoleto' }] }))))
  assert.match(screen.text(), /Resultado atual/)
  assert.doesNotMatch(screen.text(), /Resultado obsoleto/)
})

test('details follow the reference with scope, services, photos and the real client, without the AI compatibility panel', async t => {
  const screen = await renderPage(t, async url => {
    assert.ok(url.endsWith(`/oportunidades/${id}`))
    return Response.json({ ...item, description: 'Descrição do banco', details: 'Detalhes do cliente', specifications: '- Avaliar circuito\n- Substituir tomada',
      client: { name: 'Cliente do pedido', memberSince: '2026-01-15T12:00:00Z', ordersCount: 7, completedOrdersCount: 3 },
      photos: [{ id: '30000000-0000-4000-8000-000000000001', url: 'https://example.invalid/foto.jpg', description: 'Tomada danificada' }] })
  }, 'OpportunityDetailsPage')
  assert.match(screen.text(), /Descrição do banco/)
  assert.match(screen.text(), /Detalhes do cliente/)
  assert.match(screen.text(), /Informações do Cliente|Cliente do pedido|3 serviços concluídos/)
  assert.match(screen.text(), /Escopo do Pedido|Serviços Necessários|Substituir tomada/)
  assert.equal(screen.renderer.root.findByType('img').props.src, 'https://example.invalid/foto.jpg')
  const proposalLinks = screen.renderer.root.findAllByType('a').filter(node => node.children.some(child => child === 'Enviar Proposta'))
  assert.equal(proposalLinks.length, 2)
  assert.ok(proposalLinks.every(node => node.props.href === `/oportunidades/proposta?id=${id}`))
  assert.doesNotMatch(screen.text(), /Pedir Esclarecimento|esclarecimentos estarão/)
  assert.doesNotMatch(screen.text(), /Ana Rodrigues|92%|Análise de Compatibilidade|Taxa de avaliação|Sempre em dia|R\$/)
})

test('a closed or mismatched opportunity shows unavailability instead of falling back to a fake order', async t => {
  const screen = await renderPage(t, async () => Response.json({}, { status: 404 }), 'OpportunityDetailsPage')
  assert.match(screen.text(), /não está mais disponível/)
  assert.doesNotMatch(screen.text(), /Infiltração no banheiro|Ana Rodrigues/)
})

test('proposal form keeps the real order, previews values and warranty, and uses the current professional identity', async t => {
  const screen = await renderPage(t, async url => {
    assert.ok(url.endsWith(`/oportunidades/${id}`))
    return Response.json({ ...item, description: 'Descrição do banco', photos: [] })
  }, 'SendProposalPage')
  assert.match(screen.text(), /Pedido real elétrico/)
  assert.match(screen.text(), /Fornecedor teste/)
  assert.equal(screen.renderer.root.findAllByType('a')[0].props.href, `/oportunidades/detalhes?id=${id}`)
  await act(async () => screen.renderer.root.findByProps({ name: 'value' }).props.onChange({ target: { value: '145000' } }))
  assert.match(screen.text(), /1.450,00/)
  assert.match(screen.text(), /1.305,00/)
  await act(async () => screen.renderer.root.findByProps({ name: 'guaranteePeriod' }).props.onChange({ target: { value: '180 dias' } }))
  assert.match(screen.text(), /180 dias de garantia/)
  assert.equal(screen.renderer.root.findByProps({ name: 'startDate' }).props.value, '')
  assert.equal(screen.renderer.root.findByProps({ name: 'guaranteePeriod' }).props.required, true)
  assert.equal(screen.button('Enviar Proposta').props.disabled, false)
  assert.doesNotMatch(screen.text(), /Carlos Silva|48 serviços|Verificado|Sugestão IA|Dica da IA/)
})

test('proposal portfolio shows real local previews, validates uploads and revokes removed images', async t => {
  let nextUrl = 0
  const revoked = []
  t.mock.method(URL, 'createObjectURL', () => `blob:preview-${++nextUrl}`)
  t.mock.method(URL, 'revokeObjectURL', url => revoked.push(url))
  const screen = await renderPage(t, async () => Response.json({ ...item, description: 'Descrição real', photos: [] }), 'SendProposalPage')
  const upload = async files => { await act(async () => screen.renderer.root.findByProps({ name: 'portfolio' }).props.onChange({ target: { files, value: 'selected' } })) }
  assert.equal(screen.renderer.root.findAllByType('img').length, 0)
  await upload([{ name: 'one.png', type: 'image/png', size: 100 }, { name: 'two.jpg', type: 'image/jpeg', size: 100 }])
  assert.equal(screen.renderer.root.findAllByType('img').length, 2)
  await upload([{ name: 'bad.pdf', type: 'application/pdf', size: 100 }])
  assert.match(screen.text(), /apenas imagens JPG ou PNG/)
  assert.equal(nextUrl, 2)
  await upload([{ name: 'large.png', type: 'image/png', size: 6 * 1024 * 1024 }])
  assert.match(screen.text(), /até 5 MB/)
  await upload(Array.from({ length: 4 }, () => ({ name: 'extra.png', type: 'image/png', size: 100 })))
  assert.match(screen.text(), /no máximo 5 fotos/)
  await act(async () => screen.renderer.root.findByProps({ 'aria-label': 'Remover one.png' }).props.onClick())
  assert.deepEqual(revoked, ['blob:preview-1'])
  assert.equal(screen.renderer.root.findAllByType('img').length, 1)
})

test('proposal form cannot replace an unavailable real order with a demonstration record', async t => {
  const screen = await renderPage(t, async () => Response.json({}, { status: 404 }), 'SendProposalPage')
  assert.match(screen.text(), /não está disponível para receber sua proposta/)
  assert.equal(screen.renderer.root.findAllByType('form').length, 0)
})

test('proposal form posts once on repeated clicks and shows success only after confirmed persistence', async t => {
  const posts = []
  let release
  const screen = await renderPage(t, async (url, options) => {
    if (options.method !== 'POST') return Response.json({ ...item, description: 'Descrição real', photos: [] })
    const data = JSON.parse(options.body.get('proposal'))
    posts.push(data)
    assert.equal(options.headers['Content-Type'], undefined)
    assert.equal(options.headers.Authorization, 'Bearer test-token')
    return new Promise(resolve => { release = () => resolve(Response.json({ id: data.requestId, orderId: id, status: 'Sent', value: data.valueCents / 100, portfolio: [] }, { status: 201 })) })
  }, 'SendProposalPage')
  await act(async () => screen.renderer.root.findByProps({ name: 'value' }).props.onChange({ target: { value: '145000' } }))
  await act(async () => screen.renderer.root.findByProps({ name: 'description' }).props.onChange({ target: { value: 'Diagnóstico e reparo completo do circuito elétrico.' } }))
  const event = { preventDefault() {}, currentTarget: { reportValidity: () => true } }
  await act(async () => { void screen.renderer.root.findByType('form').props.onSubmit(event); void screen.renderer.root.findByType('form').props.onSubmit(event) })
  assert.equal(posts.length, 1)
  assert.doesNotMatch(screen.text(), /enviada com sucesso/)
  assert.equal(screen.renderer.root.findByType('form').props['aria-busy'], true)
  await act(async () => release())
  assert.match(screen.text(), /Proposta enviada com sucesso/)
  assert.equal(screen.renderer.root.findAllByType('button').filter(node => node.children.includes('Enviar Proposta')).length, 0)
})

test('an uncertain submission locks its draft and reuses the same request identifier to confirm it', async t => {
  const posts = []
  const screen = await renderPage(t, async (_url, options) => {
    if (options.method !== 'POST') return Response.json({ ...item, description: 'Descrição real', photos: [] })
    const data = JSON.parse(options.body.get('proposal'))
    posts.push(data)
    return posts.length === 1 ? Response.json({}, { status: 503 })
      : Response.json({ id: data.requestId, orderId: id, status: 'Sent', value: data.valueCents / 100, portfolio: [] }, { status: 201 })
  }, 'SendProposalPage')
  await act(async () => screen.renderer.root.findByProps({ name: 'value' }).props.onChange({ target: { value: '145000' } }))
  await act(async () => screen.renderer.root.findByProps({ name: 'description' }).props.onChange({ target: { value: 'Diagnóstico e reparo completo do circuito elétrico.' } }))
  const submit = async () => { await act(async () => screen.renderer.root.findByType('form').props.onSubmit({ preventDefault() {}, currentTarget: { reportValidity: () => true } })) }
  await submit()
  assert.doesNotMatch(screen.text(), /enviada com sucesso/)
  assert.equal(screen.renderer.root.findByType('fieldset').props.disabled, true)
  assert.ok(screen.button('Verificar envio'))
  await submit()
  assert.deepEqual(posts[0], posts[1])
  assert.match(screen.text(), /Proposta enviada com sucesso/)
})

test('complete feeds filter immediately, and Update A → B → A never forces a cached filter again', async t => {
  let calls = 0
  const hydraulic = { ...item, id: secondId, specialtyCode: 'hidraulica', category: 'Hidráulica', title: 'Reparo hidráulico salvo' }
  const screen = await renderPage(t, async () => { calls++; return Response.json(page({ items: [item, hydraulic], totalItems: 2 })) })
  assert.equal(calls, 1)
  await screen.click('Atualizar')
  assert.equal(calls, 2)
  await screen.click('Hidráulica')
  assert.match(screen.text(), /Reparo hidráulico salvo/)
  assert.doesNotMatch(screen.text(), /Pedido real elétrico/)
  assert.equal(calls, 2, 'a complete, authorized feed is filtered locally')
  await screen.click('Todos')
  assert.match(screen.text(), /Pedido real elétrico/)
  assert.equal(calls, 2, 'returning to the manually refreshed filter reuses its result')
  await screen.click('Todos')
  assert.equal(calls, 2)
})

test('hover/focus prefetch and opening detail share one pending read, then reuse its saved result', async t => {
  let detailCalls = 0, release
  const screen = await renderPage(t, async url => {
    if (url.includes('/oportunidades?')) return Response.json(page())
    detailCalls++
    return new Promise(resolve => { release = () => resolve(Response.json({ ...item, description: 'Detalhe preparado antes do clique', photos: [] })) })
  })
  const link = screen.renderer.root.findAllByType('a').find(node => node.children.includes('Ver Pedido'))
  await act(async () => link.props.onFocus())
  assert.equal(detailCalls, 1)
  await screen.show('OpportunityDetailsPage')
  assert.equal(detailCalls, 1, 'the mounted detail joins the prefetch request')
  await act(async () => release())
  assert.match(screen.text(), /Detalhe preparado antes do clique/)
  await screen.show('OpportunitiesPage')
  await screen.show('OpportunityDetailsPage')
  assert.match(screen.text(), /Detalhe preparado antes do clique/)
  assert.equal(detailCalls, 1)
})
