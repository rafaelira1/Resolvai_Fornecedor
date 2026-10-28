import { ApiError, REGISTRATION_UNCERTAIN_MESSAGE, requestJson } from './api.js'

const registrationFields = [
  'name', 'email', 'password', 'tipoPessoa', 'nomeExibicao', 'cpf', 'cnpj', 'telefone',
  'cidadeAtuacao', 'ufAtuacao', 'raioAtendimentoKm', 'bio', 'registroProfissional', 'especialidades',
]

function hasValidProfile(profile) {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return false
  if (typeof profile.idUsuario !== 'string'
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profile.idUsuario)
    || /^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(profile.idUsuario)) return false
  if (!['PF', 'PJ'].includes(profile.tipoPessoa)) return false
  if (['nomeExibicao', 'cidadeAtuacao', 'ufAtuacao', 'createdAt']
    .some((field) => typeof profile[field] !== 'string' || !profile[field].trim())) return false
  if (!Number.isInteger(profile.raioAtendimentoKm) || profile.raioAtendimentoKm < 1 || profile.raioAtendimentoKm > 200) return false
  if (!Array.isArray(profile.especialidades) || profile.especialidades.length === 0
    || profile.especialidades.some((code) => typeof code !== 'string' || !code.trim())
    || new Set(profile.especialidades).size !== profile.especialidades.length) return false
  if (profile.tipoPessoa === 'PJ' && (typeof profile.cnpj !== 'string' || !profile.cnpj.trim())) return false
  if (profile.tipoPessoa === 'PF' && profile.cnpj != null) return false
  return true
}

export async function registerProvider(payload, { signal, apiUrl, fetchImpl } = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ApiError('Confira os dados do cadastro antes de enviar novamente.')
  }

  const body = Object.fromEntries(registrationFields
    .filter((field) => Object.hasOwn(payload, field))
    .map((field) => [field, payload[field]]))
  const profile = await requestJson('/api/v1/auth/register-provider', {
    signal,
    apiUrl,
    fetchImpl,
    method: 'POST',
    expectedStatus: 201,
    body,
    timeoutMs: 90000,
  })

  if (!hasValidProfile(profile)) {
    throw new ApiError(REGISTRATION_UNCERTAIN_MESSAGE, { status: 201, uncertain: true })
  }

  return profile
}
