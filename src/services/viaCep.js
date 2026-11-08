import { requestJson } from './api.js'
import { BRAZILIAN_STATES } from './registrationValidation.js'

export function formatCep(value) {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 8)
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
}

export async function lookupCep(cep, { signal } = {}) {
  const digits = cep.replace('-', '')
  if (!/^[0-9]{8}$/.test(digits)) throw new Error('Informe um CEP com 8 dígitos.')

  let address
  try {
    address = await requestJson(`/ws/${digits}/json/`, {
      apiUrl: 'https://viacep.com.br', signal, timeoutMs: 8000,
    })
  } catch {
    throw new Error('Não foi possível consultar o CEP. Preencha cidade e estado manualmente ou tente outro CEP.')
  }

  if (address?.erro === true || address?.erro === 'true') {
    throw new Error('CEP não encontrado. Confira o número ou preencha cidade e estado manualmente.')
  }
  if (!address || typeof address.localidade !== 'string' || !address.localidade.trim()
    || address.localidade.trim().length > 120 || !BRAZILIAN_STATES.includes(address.uf)
    || typeof address.cep !== 'string' || address.cep.replace('-', '') !== digits) {
    throw new Error('O ViaCEP retornou um endereço inválido. Preencha cidade e estado manualmente.')
  }

  return { cidadeAtuacao: address.localidade.trim(), ufAtuacao: address.uf }
}
