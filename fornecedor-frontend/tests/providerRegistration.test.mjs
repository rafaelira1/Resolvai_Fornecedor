import assert from 'node:assert/strict'
import test from 'node:test'
import { isDeepStrictEqual } from 'node:util'
import { ApiError } from '../src/services/api.js'
import { registerProvider } from '../src/services/providerRegistration.js'

const apiUrl = 'https://api.example.invalid/backend/'
const testCpf = ['111', '444', '777', '35'].join('')
const testCnpj = ['12', 'ABC', '345', '01', 'DE', '35'].join('')

function payload(overrides = {}) {
  return {
    name: 'Conta de teste',
    email: 'prestador@example.invalid',
    password: 'senha-sintetica-de-teste',
    tipoPessoa: 'PF',
    nomeExibicao: 'Perfil de teste',
    cpf: testCpf,
    cnpj: null,
    telefone: '0'.repeat(11),
    cidadeAtuacao: 'Cidade de teste',
    ufAtuacao: 'CE',
    raioAtendimentoKm: 20,
    bio: null,
    registroProfissional: null,
    especialidades: ['hidraulica'],
    ...overrides,
  }
}

function profile(overrides = {}) {
  return {
    idUsuario: '11111111-1111-4111-8111-111111111111',
    tipoPessoa: 'PF',
    nomeExibicao: 'Perfil de teste',
    cidadeAtuacao: 'Cidade de teste',
    ufAtuacao: 'CE',
    raioAtendimentoKm: 20,
    especialidades: ['hidraulica'],
    createdAt: '2026-10-28T12:00:00Z',
    ...overrides,
  }
}

function jsonResponse(status, value) {
  return new Response(status === 204 ? null : JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

test('registration sends the backend contract once without authorization, cookies or confirmation fields', async () => {
  const calls = []
  const expectedPayload = payload()
  const expectedProfile = profile()
  const result = await registerProvider({
    ...expectedPayload,
    passwordConfirmation: expectedPayload.password,
    role: 'Admin',
    isActive: true,
  }, {
    apiUrl,
    fetchImpl: async (url, options) => {
      calls.push({ url, options })
      return jsonResponse(201, expectedProfile)
    },
  })

  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, `${apiUrl}api/v1/auth/register-provider`)
  assert.equal(calls[0].options.method, 'POST')
  const headers = new Headers(calls[0].options.headers)
  assert.equal(headers.get('Content-Type'), 'application/json')
  assert.equal(headers.get('Authorization'), null)
  assert.equal(calls[0].options.credentials, 'omit')
  assert.equal(calls[0].options.cache, 'no-store')
  assert.equal(calls[0].options.redirect, 'error')
  assert.ok(isDeepStrictEqual(JSON.parse(calls[0].options.body), expectedPayload), 'POST body must match the registration contract')
  assert.deepEqual(result, expectedProfile)
})

test('registration accepts a valid PJ response while keeping CPF absent from its payload', async () => {
  const pj = payload({ tipoPessoa: 'PJ', cpf: null, cnpj: testCnpj })
  let submitted
  const result = await registerProvider(pj, {
    apiUrl,
    fetchImpl: async (_url, options) => {
      submitted = JSON.parse(options.body)
      return jsonResponse(201, profile({ tipoPessoa: 'PJ', cnpj: testCnpj }))
    },
  })
  assert.ok(submitted.cpf === null)
  assert.ok(submitted.cnpj === testCnpj)
  assert.equal(result.tipoPessoa, 'PJ')
})

test('validation and duplicate errors retain their status without exposing upstream details', async () => {
  for (const status of [400, 409, 429]) {
    let attempts = 0
    await assert.rejects(registerProvider(payload(), {
      apiUrl,
      fetchImpl: async () => {
        attempts++
        return jsonResponse(status, { detail: 'PRIVATE_RESPONSE_BODY', traceId: 'PRIVATE_TRACE' })
      },
    }), (error) => error instanceof ApiError && error.status === status && !error.uncertain
      && !error.message.includes('PRIVATE_RESPONSE_BODY') && !error.message.includes('PRIVATE_TRACE'))
    assert.equal(attempts, 1)
  }
})

test('server errors report an uncertain registration and never retry automatically', async () => {
  for (const status of [500, 503]) {
    let attempts = 0
    await assert.rejects(registerProvider(payload(), {
      apiUrl,
      fetchImpl: async () => {
        attempts++
        return jsonResponse(status, { detail: 'PRIVATE_RESPONSE_BODY' })
      },
    }), (error) => error instanceof ApiError && error.status === status && error.uncertain
      && !error.message.includes('PRIVATE_RESPONSE_BODY'))
    assert.equal(attempts, 1)
  }
})

test('unexpected success statuses cannot complete a registration', async () => {
  for (const status of [200, 202, 204]) {
    let attempts = 0
    await assert.rejects(registerProvider(payload(), {
      apiUrl,
      fetchImpl: async () => {
        attempts++
        return jsonResponse(status, profile())
      },
    }), (error) => error instanceof ApiError && error.status === status && error.uncertain)
    assert.equal(attempts, 1)
  }
})

test('invalid or incomplete 201 responses leave the result uncertain', async () => {
  const invalidResponses = [
    () => new Response('<html>PRIVATE_RESPONSE_BODY</html>', { status: 201, headers: { 'Content-Type': 'text/html' } }),
    () => new Response('{invalid', { status: 201, headers: { 'Content-Type': 'application/json' } }),
    () => jsonResponse(201, null),
    () => jsonResponse(201, {}),
    () => jsonResponse(201, profile({ idUsuario: 'not-a-user-id' })),
    () => jsonResponse(201, profile({ especialidades: [] })),
    () => jsonResponse(201, profile({ especialidades: ['hidraulica', 'hidraulica'] })),
    () => jsonResponse(201, profile({ tipoPessoa: 'PJ' })),
  ]
  for (const response of invalidResponses) {
    let attempts = 0
    await assert.rejects(registerProvider(payload(), {
      apiUrl,
      fetchImpl: async () => { attempts++; return response() },
    }), (error) => error instanceof ApiError && error.status === 201 && error.uncertain
      && !error.message.includes('PRIVATE_RESPONSE_BODY'))
    assert.equal(attempts, 1)
  }
})

test('network and cancellation failures do not expose transport errors or repeat the POST', async () => {
  let attempts = 0
  await assert.rejects(registerProvider(payload(), {
    apiUrl,
    fetchImpl: async () => { attempts++; throw new Error('PRIVATE_TRANSPORT_DETAILS') },
  }), (error) => error instanceof ApiError && error.uncertain
    && !error.message.includes('PRIVATE_TRANSPORT_DETAILS'))
  assert.equal(attempts, 1)

  const controller = new AbortController()
  attempts = 0
  await assert.rejects(registerProvider(payload(), {
    apiUrl,
    signal: controller.signal,
    fetchImpl: async (_url, { signal }) => {
      attempts++
      controller.abort()
      assert.equal(signal.aborted, true)
      throw new DOMException('PRIVATE_TRANSPORT_DETAILS', 'AbortError')
    },
  }), (error) => error instanceof ApiError && error.uncertain)
  assert.equal(attempts, 1)
})

test('invalid API configuration is rejected before any request', async () => {
  for (const invalidUrl of ['', 'not-a-url', 'ftp://api.example.invalid', 'https://user:unused@api.example.invalid', 'https://api.example.invalid?query=1']) {
    let attempts = 0
    await assert.rejects(registerProvider(payload(), {
      apiUrl: invalidUrl,
      fetchImpl: async () => { attempts++; return jsonResponse(201, profile()) },
    }))
    assert.equal(attempts, 0)
  }
})
