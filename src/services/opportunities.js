import { ApiError } from './api.js'
import { authSession } from './session.js'

const base = '/api/v1/fornecedores/me/oportunidades'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const nonempty = value => typeof value === 'string' && value.trim().length > 0
const optionalText = value => value === undefined || typeof value === 'string'

function validOpportunity(item) {
  return item && uuid.test(item.id) && nonempty(item.title) && nonempty(item.category)
    && nonempty(item.specialtyCode) && Number.isFinite(Date.parse(item.createdAt))
    && Number.isSafeInteger(item.proposalsCount) && item.proposalsCount >= 0
    && optionalText(item.location) && optionalText(item.urgency)
}

export async function getOpportunities({ page = 1, pageSize = 10, search = '', category = '', sort = 'recent', signal, auth = authSession } = {}) {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize), search: search.trim(), category, sort })
  const result = await auth.request(`${base}?${query}`, { signal })
  if (!result || !Array.isArray(result.items) || !result.items.every(validOpportunity)
    || result.page !== page || result.pageSize !== pageSize || result.items.length > pageSize
    || !Number.isSafeInteger(result.totalItems) || result.totalItems < 0
    || result.totalPages !== Math.ceil(result.totalItems / pageSize)
    || new Set(result.items.map(item => item.id)).size !== result.items.length
    || !Array.isArray(result.specialties)
    || !result.specialties.every(item => nonempty(item.codigo) && nonempty(item.nome))
    || !result.items.every(item => result.specialties.some(specialty => specialty.codigo === item.specialtyCode))) {
    throw new ApiError('Não foi possível carregar as oportunidades. Tente novamente.')
  }
  return result
}

export async function getOpportunity(id, { signal, auth = authSession } = {}) {
  if (!uuid.test(id ?? '')) throw new ApiError('Pedido não encontrado.', { status: 404 })
  const result = await auth.request(`${base}/${encodeURIComponent(id)}`, { signal, invalidateOnNotFound: false })
  if (!validOpportunity(result) || result.id.toLowerCase() !== id.toLowerCase()
    || typeof result.description !== 'string' || !optionalText(result.details) || !optionalText(result.specifications)
    || (result.client !== undefined && (!nonempty(result.client?.name) || !Number.isFinite(Date.parse(result.client?.memberSince))
      || !Number.isSafeInteger(result.client?.ordersCount) || result.client.ordersCount < 0
      || !Number.isSafeInteger(result.client?.completedOrdersCount) || result.client.completedOrdersCount < 0))
    || !Array.isArray(result.photos) || !result.photos.every(photo => uuid.test(photo.id) && nonempty(photo.url) && optionalText(photo.description))) {
    throw new ApiError('Não foi possível carregar os dados deste pedido. Tente novamente.')
  }
  return result
}

export function getUrgency(urgency) {
  const value = urgency?.trim().toLocaleLowerCase('pt-BR')
  if (['urgente', 'alta'].includes(value)) return { label: 'Urgente', tone: 'alta' }
  if (['nos próximos dias', 'nos proximos dias', 'média', 'media'].includes(value)) return { label: 'Nos próximos dias', tone: 'média' }
  if (['pode esperar', 'baixa'].includes(value)) return { label: 'Pode esperar', tone: 'baixa' }
  return { label: urgency || 'Não informada', tone: 'unknown' }
}

export function formatOpportunityDate(value) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

export function getOpportunityPhotoUrl(value) {
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null
  } catch { return null }
}
