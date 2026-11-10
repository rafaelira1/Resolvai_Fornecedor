import { ApiError } from './api.js'
import { authSession } from './session.js'
import { providerDataCache } from './providerDataCache.js'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const failure = 'Não foi possível confirmar o envio. Tente novamente com os mesmos dados; isso não duplicará a proposta.'

export async function sendProposal(orderId, data, files, { auth = authSession } = {}) {
  if (!uuid.test(orderId) || !uuid.test(data.requestId)) throw new ApiError('Pedido ou identificador de envio inválido.')
  if (!Number.isSafeInteger(data.valueCents) || data.valueCents < 1 || data.valueCents > 99_999_999_999) throw new ApiError('Informe um valor maior que zero.')
  if (data.description.trim().length < 20 || data.description.trim().length > 2000) throw new ApiError('Descreva o serviço com 20 a 2000 caracteres.')
  if (!data.deadline || !data.guaranteePeriod || !data.guaranteeType) throw new ApiError('Informe o prazo de execução e a garantia.')
  if (files.length > 5 || files.some(file => !['image/jpeg', 'image/png'].includes(file.type) || !file.size || file.size > 5 * 1024 * 1024)) throw new ApiError('Envie até 5 fotos JPG ou PNG de até 5 MB cada.')
  const body = new FormData()
  body.append('proposal', JSON.stringify({
    requestId: data.requestId, valueCents: data.valueCents, deadline: data.deadline,
    ...(data.startDate ? { startDate: data.startDate } : {}), description: data.description.trim(),
    materials: data.materials?.trim() || undefined, guaranteePeriod: data.guaranteePeriod,
    guaranteeType: data.guaranteeType, guaranteeConditions: data.guaranteeConditions?.trim() || undefined,
  }))
  for (const file of files) body.append('portfolio', file, file.name)
  let result
  try {
    result = await auth.request(`/api/v1/fornecedores/me/oportunidades/${orderId}/propostas`, {
      method: 'POST', body, expectedStatus: 201, timeoutMs: 360000, invalidateOnNotFound: false,
    })
  } catch (error) {
    const messages = {
      400: 'Confira os dados, a data de início e as fotos da proposta.',
      404: 'O pedido não está mais disponível ou não corresponde às suas especialidades.',
      409: 'Este identificador já foi utilizado com outros dados. Volte ao pedido para iniciar outra proposta.',
      413: 'As fotos ultrapassam o limite permitido. Use até 5 imagens de até 5 MB.',
      429: 'Muitos envios em pouco tempo. Aguarde alguns minutos antes de tentar novamente.',
    }
    if (messages[error.status]) throw new ApiError(messages[error.status], { status: error.status })
    if (error.status === 401 || error.status === 403) throw error
    throw new ApiError(failure, { status: error.status, uncertain: true })
  }
  if (!result || result.id !== data.requestId || result.orderId !== orderId || !['Sent', 'Viewed', 'Chosen'].includes(result.status)
    || result.value !== data.valueCents / 100 || !Array.isArray(result.portfolio) || result.portfolio.length !== files.length
    || !result.portfolio.every(photo => typeof photo.url === 'string' && /^https?:\/\//.test(photo.url))) {
    throw new ApiError(failure, { uncertain: true })
  }
  providerDataCache.clear()
  return result
}
