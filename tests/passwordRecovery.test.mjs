import assert from 'node:assert/strict'
import test from 'node:test'
import { createPasswordRecoveryClient, RECOVERY_LINK_ERROR } from '../src/services/passwordRecovery.js'

const now = 1800000000000
const json = (value, status = 200) => Response.json(value, { status })
function callback(client, hash = '#type=recovery&access_token=recovery-token&refresh_token=discard-me&token_type=bearer&expires_in=3600', pathname = '/redefinir-senha') {
  const replacements = []
  client.captureSession({ pathname, hash }, { replaceState: (...args) => replacements.push(args) })
  return replacements
}

test('requests a recovery email from the real API with the frontend callback and no login token', async () => {
  const calls = []
  const client = createPasswordRecoveryClient({ fetchImpl: async (...args) => { calls.push(args); return json({ message: 'accepted' }) } })
  await client.requestRecovery(' test@example.com ', 'http://localhost:5173')
  assert.equal(calls.length, 1)
  assert.equal(calls[0][0], '/api/v1/auth/forgot-password')
  assert.deepEqual(JSON.parse(calls[0][1].body), { email: 'test@example.com', redirectTo: 'http://localhost:5173/redefinir-senha' })
  assert.equal(calls[0][1].headers.Authorization, undefined)
})

test('callback accepts only recovery sessions, scrubs the URL, and works at the site URL fallback', () => {
  const client = createPasswordRecoveryClient({ now: () => now })
  const replacements = callback(client, undefined, '/')
  assert.equal(client.hasValidSession(), true)
  assert.deepEqual(replacements, [[null, '', '/redefinir-senha']])
  callback(client, '#type=signup&access_token=other-token&token_type=bearer&expires_in=3600')
  assert.equal(client.hasValidSession(), false)
})

test('expired, missing, malformed and rejected links cannot change passwords', async () => {
  for (const hash of ['', '#error=access_denied&error_code=otp_expired&error_description=private-detail', '#type=recovery&access_token=x&token_type=bearer&expires_at=1', '#type=recovery&access_token=x&token_type=bearer&expires_in=bad', '#type=recovery&token_type=bearer&expires_in=3600']) {
    const client = createPasswordRecoveryClient({ now: () => now, fetchImpl: () => assert.fail('invalid callback must not send a request') })
    callback(client, hash)
    assert.equal(client.hasValidSession(), false)
    await assert.rejects(client.resetPassword('NovaSenha123!', 'NovaSenha123!'), { message: RECOVERY_LINK_ERROR })
  }
})

test('validates confirmation and password limits before sending the token', async () => {
  const client = createPasswordRecoveryClient({ now: () => now, fetchImpl: () => assert.fail('invalid passwords must not send a request') })
  callback(client)
  for (const password of ['short', ' '.repeat(8), 'a'.repeat(129)]) await assert.rejects(client.resetPassword(password, password), /8 e 128/)
  await assert.rejects(client.resetPassword('NovaSenha123!', 'OutraSenha123!'), /não coincidem/)
  assert.equal(client.hasValidSession(), true)
})

test('resets only with the email token, preserves password characters and discards the token after success', async () => {
  const calls = []
  const client = createPasswordRecoveryClient({ now: () => now, fetchImpl: async (...args) => { calls.push(args); return json({ message: 'Senha redefinida.' }) } })
  callback(client)
  await client.resetPassword(' NovaSenha123! ', ' NovaSenha123! ')
  assert.equal(calls[0][0], '/api/v1/auth/reset-password')
  assert.equal(calls[0][1].headers.Authorization, 'Bearer recovery-token')
  assert.deepEqual(JSON.parse(calls[0][1].body), { newPassword: ' NovaSenha123! ' })
  assert.equal(client.hasValidSession(), false)
  await assert.rejects(client.resetPassword('NovaSenha123!', 'NovaSenha123!'), { message: RECOVERY_LINK_ERROR })
  assert.equal(calls.length, 1)
})

test('expiry while editing prevents the password request', async () => {
  let clock = now
  const client = createPasswordRecoveryClient({ now: () => clock, fetchImpl: () => assert.fail('expired token') })
  callback(client)
  clock += 3600000
  await assert.rejects(client.resetPassword('NovaSenha123!', 'NovaSenha123!'), { message: RECOVERY_LINK_ERROR })
})

test('server rejection invalidates the recovery session while policy and rate errors remain retryable', async () => {
  for (const status of [400, 401, 403, 429, 503]) {
    const client = createPasswordRecoveryClient({ now: () => now, fetchImpl: async () => json({}, status) })
    callback(client)
    await assert.rejects(client.resetPassword('NovaSenha123!', 'NovaSenha123!'))
    assert.equal(client.hasValidSession(), ![401, 403].includes(status))
  }
})

test('delivery failures, HTML and malformed success cannot show a sent email confirmation', async () => {
  for (const response of [json({}, 429), json({}, 503), new Response('<html>fallback</html>', { headers: { 'Content-Type': 'text/html' } }), json({})]) {
    const client = createPasswordRecoveryClient({ fetchImpl: async () => response })
    await assert.rejects(client.requestRecovery('test@example.com', 'http://localhost:5173'))
  }
})
