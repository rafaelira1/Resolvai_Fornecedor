import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiError } from '../src/services/api.js'
import { getServiceCategories } from '../src/services/serviceCategories.js'

const apiUrl = 'https://api.example.invalid'

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

test('specialties come from the public API and preserve codes, order and existing icons', async () => {
  const catalog = [
    { codigo: 'hidraulica', nome: 'Hidráulica' },
    { codigo: 'eletrica', nome: 'Elétrica' },
    { codigo: 'impermeabilizacao', nome: 'Impermeabilização' },
    { codigo: 'pintura', nome: 'Pintura' },
    { codigo: 'alvenaria', nome: 'Alvenaria' },
    { codigo: 'serralheria', nome: 'Serralheria' },
    { codigo: 'nova_especialidade', nome: 'Nova especialidade' },
  ]
  let attempts = 0
  const result = await getServiceCategories({
    apiUrl,
    fetchImpl: async (url, options) => {
      attempts++
      assert.equal(url, `${apiUrl}/api/v1/especialidades`)
      assert.equal(options.method, 'GET')
      assert.equal(new Headers(options.headers).get('Authorization'), null)
      assert.equal(options.credentials, 'omit')
      return jsonResponse(200, catalog)
    },
  })
  assert.equal(attempts, 1)
  assert.deepEqual(result.map((category) => category.id), catalog.map((category) => category.codigo))
  assert.deepEqual(result.map((category) => category.name), catalog.map((category) => category.nome))
  assert.deepEqual(result.map((category) => category.icon), ['wrench', 'bolt', 'drop', 'paint', 'bricks', 'tools', 'tools'])
})

test('an empty catalog stays empty instead of returning demonstration categories', async () => {
  const result = await getServiceCategories({ apiUrl, fetchImpl: async () => jsonResponse(200, []) })
  assert.deepEqual(result, [])
})

test('malformed catalogs fail instead of displaying incomplete or duplicate choices', async () => {
  for (const catalog of [
    {}, null, [null], [{ codigo: 'hidraulica' }], [{ codigo: '', nome: 'Nome' }],
    [{ codigo: 'hidraulica', nome: ' ' }],
    [{ codigo: 'hidraulica', nome: 'Hidráulica' }, { codigo: ' hidraulica ', nome: 'Duplicada' }],
  ]) {
    await assert.rejects(getServiceCategories({ apiUrl, fetchImpl: async () => jsonResponse(200, catalog) }),
      (error) => error instanceof ApiError && !error.uncertain)
  }
  await assert.rejects(getServiceCategories({
    apiUrl,
    fetchImpl: async () => new Response('{invalid', { status: 200, headers: { 'Content-Type': 'application/json' } }),
  }), (error) => error instanceof ApiError && !error.uncertain)
})

test('catalog failures surface a controlled error with no fallback or automatic retry', async () => {
  let attempts = 0
  await assert.rejects(getServiceCategories({
    apiUrl,
    fetchImpl: async () => { attempts++; return jsonResponse(503, { detail: 'PRIVATE_RESPONSE_BODY' }) },
  }), (error) => error instanceof ApiError && error.status === 503 && !error.uncertain
    && !error.message.includes('PRIVATE_RESPONSE_BODY'))
  assert.equal(attempts, 1)

  await assert.rejects(getServiceCategories({
    apiUrl,
    fetchImpl: async () => { throw new Error('PRIVATE_TRANSPORT_DETAILS') },
  }), (error) => error instanceof ApiError && !error.message.includes('PRIVATE_TRANSPORT_DETAILS'))
})

test('cancelled catalog reads remain distinguishable from service failures', async () => {
  const controller = new AbortController()
  await assert.rejects(getServiceCategories({
    apiUrl,
    signal: controller.signal,
    fetchImpl: async (_url, { signal }) => {
      controller.abort()
      assert.equal(signal.aborted, true)
      throw new DOMException('Cancelled', 'AbortError')
    },
  }), (error) => error.name === 'AbortError')
})
