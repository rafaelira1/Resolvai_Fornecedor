import assert from 'node:assert/strict'
import test from 'node:test'
import { requestJson } from '../src/services/api.js'

const response = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

test('default and empty API origins use same-origin routes', async () => {
  for (const options of [{}, { apiUrl: '' }]) {
    let target
    await requestJson('/api/v1/especialidades', { ...options, fetchImpl: async (url) => { target = url; return response(200, []) } })
    assert.equal(target, '/api/v1/especialidades')
  }
})

test('non-registration POST failures never claim uncertain signup', async () => {
  for (const fetchImpl of [async () => response(503, {}), async () => { throw new Error('private') }]) {
    await assert.rejects(requestJson('/api/v1/auth/login-provider', { method: 'POST', body: {}, apiUrl: 'https://api.example.invalid', fetchImpl }), (error) => !error.uncertain && !error.message.includes('cadastro') && !error.message.includes('private'))
  }
})
