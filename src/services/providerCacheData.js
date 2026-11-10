const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
const text = value => typeof value === 'string'
const optionalText = value => value === undefined || text(value)
const count = value => Number.isSafeInteger(value) && value >= 0
const date = value => text(value) && Number.isFinite(Date.parse(value))

export const providerCacheKeys = {
  orders: 'my-orders', summary: 'provider-summary', categories: 'specialties',
  order: id => `my-order:${id}`,
  opportunity: id => `opportunity:${id}`,
  opportunities: ({ page = 1, pageSize = 10, search = '', category = '', sort = 'recent' } = {}) =>
    `opportunities:${JSON.stringify({ page, pageSize, search: search.trim(), category, sort })}`,
}

function validOrder(order) {
  return order && uuid(order.id) && uuid(order.proposalId)
    && ['accepted', 'in_progress', 'completed', 'cancelled'].includes(order.status)
    && Number.isFinite(order.value) && order.value > 0 && date(order.createdAt)
    && ['title', 'customer', 'location', 'deadline', 'guarantee', 'scope', 'proposalDescription'].every(field => text(order[field]))
}

function validOpportunity(item) {
  return item && uuid(item.id) && text(item.title) && text(item.category) && text(item.specialtyCode)
    && date(item.createdAt) && count(item.proposalsCount) && optionalText(item.location) && optionalText(item.urgency)
}

// Browser storage is untrusted. Restore only the known read-only response shapes.
export function validProviderCacheData(key, data) {
  if (typeof key !== 'string') return false
  if (key === providerCacheKeys.orders) return Array.isArray(data) && data.every(validOrder)
  if (key.startsWith('my-order:')) return validOrder(data) && data.id === key.slice('my-order:'.length)
  if (key === providerCacheKeys.summary) {
    return data && count(data.newOrdersLast24h) && count(data.compatibleOpenOrders) && data.proposals
      && ['total', 'sent', 'viewed', 'chosen', 'notChosen'].every(field => count(data.proposals[field]))
      && data.proposals.total === data.proposals.sent + data.proposals.viewed + data.proposals.chosen + data.proposals.notChosen
  }
  if (key === providerCacheKeys.categories) {
    return Array.isArray(data) && data.every(item => item && text(item.id) && text(item.name) && text(item.icon))
  }
  if (key.startsWith('opportunities:')) {
    let filters
    try { filters = JSON.parse(key.slice('opportunities:'.length)) } catch { return false }
    return data && Array.isArray(data.items) && data.items.every(validOpportunity)
      && data.page === filters.page && data.pageSize === filters.pageSize && data.items.length <= data.pageSize
      && count(data.totalItems) && data.totalPages === Math.ceil(data.totalItems / data.pageSize)
      && Array.isArray(data.specialties) && data.specialties.every(item => item && text(item.codigo) && text(item.nome))
  }
  if (key.startsWith('opportunity:')) {
    return validOpportunity(data) && data.id === key.slice('opportunity:'.length) && text(data.description)
      && optionalText(data.details) && optionalText(data.specifications)
      && Array.isArray(data.photos) && data.photos.every(photo => photo && uuid(photo.id) && text(photo.url) && optionalText(photo.description))
      && (data.client === undefined || (data.client && text(data.client.name) && date(data.client.memberSince)
        && count(data.client.ordersCount) && count(data.client.completedOrdersCount)))
  }
  return false
}
