import { ApiError } from './api.js'
import { hasValidProfile } from './providerRegistration.js'
import { validateRegistration, PROFESSIONAL_FIELDS } from './registrationValidation.js'
import { authSession } from './session.js'

function confirmProfile(profile, auth) {
  if (!hasValidProfile(profile)
    || ['name', 'email', 'telefone'].some((field) => typeof profile[field] !== 'string' || !profile[field].trim())
    || (profile.bio != null && typeof profile.bio !== 'string')
    || (profile.registroProfissional != null && typeof profile.registroProfissional !== 'string')
    || (profile.cpf != null && typeof profile.cpf !== 'string')) {
    throw new ApiError('O serviço retornou um perfil inválido. Tente carregar novamente.')
  }
  auth.setProfile(profile)
  return profile
}

export function validateProviderProfile(values, availableSpecialties) {
  // Reuse the registration rules, selecting only fields editable in this flow.
  const errors = validateRegistration(values, { availableSpecialties })
  if (values.raioAtendimentoKm == null || String(values.raioAtendimentoKm).trim() === '') {
    errors.raioAtendimentoKm = 'Informe um raio inteiro entre 1 e 200 km.'
  }
  return Object.fromEntries(Object.entries(errors)
    .filter(([field]) => ['name', 'telefone', ...PROFESSIONAL_FIELDS].includes(field)))
}

export async function getProviderProfile({ auth = authSession, signal } = {}) {
  return confirmProfile(await auth.request('/api/v1/fornecedores/me', { signal }), auth)
}

export async function updateProviderProfile(values, { auth = authSession, availableSpecialties } = {}) {
  const errors = validateProviderProfile(values, availableSpecialties)
  if (Object.keys(errors).length) throw new ApiError(Object.values(errors)[0], { status: 400 })
  const body = {
    name: values.name.trim(), nomeExibicao: values.nomeExibicao.trim(),
    telefone: values.telefone.replace(/[^0-9]/g, ''),
    cidadeAtuacao: values.cidadeAtuacao.trim(), ufAtuacao: values.ufAtuacao.toUpperCase(),
    raioAtendimentoKm: Number(values.raioAtendimentoKm),
    bio: values.bio?.trim() || null, registroProfissional: values.registroProfissional?.trim() || null,
    especialidades: [...new Set(values.especialidades.map((code) => code.trim()))].sort(),
  }
  return confirmProfile(await auth.request('/api/v1/fornecedores/me', { method: 'PATCH', body }), auth)
}
