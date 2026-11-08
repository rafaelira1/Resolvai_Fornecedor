import assert from 'node:assert/strict'
import test from 'node:test'
import { sendProposal } from '../src/services/proposals.js'

const orderId = '20000000-0000-4000-8000-000000000001'
const data = { requestId: '30000000-0000-4000-8000-000000000001', valueCents: 145000, deadline: '3 dias', startDate: '2099-01-01', description: ' Diagnóstico e reparo completo do circuito elétrico. ', materials: ' Tomada ', guaranteePeriod: '90 dias', guaranteeType: 'Reexecução gratuita', guaranteeConditions: ' Serviços realizados ' }

test('sends every proposal field and the original file as authenticated multipart, without client-supplied identity', async () => {
  const photo = new File([new Uint8Array([137,80,78,71,13,10,26,10,0])], 'portfolio.png', { type: 'image/png' })
  const result = await sendProposal(orderId, data, [photo], { auth: { request: async (url, options) => {
    assert.equal(url, `/api/v1/fornecedores/me/oportunidades/${orderId}/propostas`)
    assert.equal(options.expectedStatus, 201)
    assert.equal(options.invalidateOnNotFound, false)
    const values = JSON.parse(options.body.get('proposal'))
    assert.deepEqual(values, { ...data, description: data.description.trim(), materials: 'Tomada', guaranteeConditions: 'Serviços realizados' })
    assert.equal(values.providerId, undefined)
    const file = options.body.get('portfolio')
    assert.equal(file.name, 'portfolio.png')
    assert.equal(file.size, photo.size)
    return { id: data.requestId, orderId, status: 'Sent', value: 1450, portfolio: [{ url: 'https://storage.invalid/portfolio.png', name: file.name }] }
  } } })
  assert.equal(result.id, data.requestId)
})

test('invalid values never send a proposal; network and malformed success remain unconfirmed without automatic retry', async () => {
  const auth = { request: () => assert.fail('invalid payload must not be sent') }
  for (const extra of [{ valueCents: 0 }, { valueCents: 0.5 }, { description: 'curta' }, { guaranteePeriod: '' }]) await assert.rejects(sendProposal(orderId, { ...data, ...extra }, [], { auth }))
  for (const outcome of ['network', 'malformed']) {
    let attempts = 0
    await assert.rejects(sendProposal(orderId, data, [], { auth: { request: async () => {
      attempts++
      if (outcome === 'network') throw new Error('private transport details')
      return {}
    } } }), error => error.uncertain === true && !error.message.includes('private'))
    assert.equal(attempts, 1)
  }
})
