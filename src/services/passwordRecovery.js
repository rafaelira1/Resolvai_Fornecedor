import { ApiError, requestJson } from './api.js'

export const RECOVERY_LINK_ERROR = 'Este link de recuperação é inválido ou expirou. Solicite um novo link.'

// A recovery token is separate from the professional login and lives only in memory.
export function createPasswordRecoveryClient({ apiUrl, fetchImpl, now = Date.now } = {}) {
  let session = null

  function captureSession(location, history) {
    const params = new URLSearchParams(location.hash.replace(/^#/, ''))
    const callback = params.get('type') === 'recovery' || location.pathname === '/redefinir-senha'
      || params.has('error_code') || params.has('error_description')
    if (!callback) return
    session = null
    const accessToken = params.get('access_token')
    const expiresAt = params.has('expires_at') ? Number(params.get('expires_at')) * 1000
      : now() + Number(params.get('expires_in') ?? 0) * 1000
    if (params.get('type') === 'recovery' && params.get('token_type')?.toLowerCase() === 'bearer'
      && accessToken?.trim() && !params.has('error') && !params.has('error_code')
      && Number.isFinite(expiresAt) && expiresAt > now()) {
      session = { accessToken, expiresAt }
    }
    // Remove tokens, refresh tokens and provider errors before React or other requests run.
    history.replaceState(null, '', '/redefinir-senha')
  }

  function hasValidSession() {
    if (session && session.expiresAt <= now()) session = null
    return session !== null
  }

  async function requestRecovery(email, origin) {
    const result = await requestJson('/api/v1/auth/forgot-password', {
      apiUrl, fetchImpl, method: 'POST', timeoutMs: 30000,
      body: { email: email.trim(), redirectTo: new URL('/redefinir-senha', origin).href },
    })
    if (typeof result?.message !== 'string' || !result.message.trim()) {
      throw new ApiError('Não foi possível confirmar a solicitação. Tente novamente mais tarde.')
    }
  }

  async function resetPassword(newPassword, confirmation) {
    if (!hasValidSession()) throw new ApiError(RECOVERY_LINK_ERROR, { status: 401 })
    if (newPassword.length < 8 || newPassword.length > 128 || !newPassword.trim()) {
      throw new ApiError('A nova senha deve ter entre 8 e 128 caracteres.')
    }
    if (newPassword !== confirmation) throw new ApiError('As senhas não coincidem.')
    try {
      const result = await requestJson('/api/v1/auth/change-password', {
        apiUrl, fetchImpl, method: 'POST', body: { newPassword }, accessToken: session.accessToken,
      })
      if (typeof result?.message !== 'string' || !result.message.trim()) {
        throw new ApiError('Não foi possível confirmar a alteração da senha. Tente entrar com a nova senha.')
      }
      session = null
    } catch (error) {
      if ([401, 403, 404].includes(error.status)) {
        session = null
        throw new ApiError(RECOVERY_LINK_ERROR, { status: error.status })
      }
      if (error.status === 400 || error.status === 422) {
        throw new ApiError('A nova senha não foi aceita. Use de 8 a 128 caracteres e siga as regras de segurança da sua conta.', { status: error.status })
      }
      throw error
    }
  }

  return { captureSession, hasValidSession, requestRecovery, resetPassword }
}

export const passwordRecovery = createPasswordRecoveryClient()

export function requestPasswordRecovery(email) {
  return passwordRecovery.requestRecovery(email, window.location.origin)
}
