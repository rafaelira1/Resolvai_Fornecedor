import { ApiError } from './api.js'
import { authSession } from './session.js'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const statuses = { Pending: 'accepted', InProgress: 'in_progress', Completed: 'completed', Cancelled: 'cancelled' }
const optionalText = value => value === undefined || typeof value === 'string'
const nonempty = value => typeof value === 'string' && value.trim().length > 0
const count = value => Number.isSafeInteger(value) && value >= 0
const invalid = () => new ApiError('Não foi possível confirmar os dados dos seus pedidos. Tente novamente.')

function validProposal(item) {
  return item && uuid.test(item.id) && uuid.test(item.orderId) && item.status === 'Chosen'
    && nonempty(item.orderTitle) && Object.hasOwn(statuses, item.orderStatus)
    && Number.isFinite(item.value) && item.value > 0 && Number.isFinite(Date.parse(item.createdAt))
    && ['orderLocation', 'deadline', 'description', 'warranty'].every(field => optionalText(item[field]))
    && (item.deadlineDays === undefined || (Number.isInteger(item.deadlineDays) && item.deadlineDays > 0))
}

function toOrder(detail) {
  const proposal = detail.myProposal
  return {
    id: detail.id, proposalId: proposal.id, title: detail.title,
    customer: detail.customerFirstName, location: detail.location?.trim() || 'Local não informado',
    status: statuses[detail.status], value: proposal.value,
    deadline: proposal.deadline?.trim() || (proposal.deadlineDays ? `${proposal.deadlineDays} dias` : 'Não informado'),
    guarantee: proposal.warranty?.trim() || 'Não informada', scope: detail.description,
    proposalDescription: proposal.description?.trim() || '', createdAt: proposal.createdAt,
  }
}

export async function getMyOrder(id, { auth = authSession, signal } = {}) {
  if (!uuid.test(id ?? '')) throw new ApiError('Pedido não encontrado.', { status: 404 })
  let detail
  try {
    detail = await auth.request(`/api/v1/provider/orders/${encodeURIComponent(id)}`, { signal, invalidateOnNotFound: false })
  } catch (error) {
    if (error.status === 404) throw new ApiError('Pedido não encontrado ou indisponível para sua conta.', { status: 404 })
    throw error
  }
  // An open opportunity is not a contracted service. Only the current provider's chosen proposal qualifies.
  if (!detail?.myProposal || detail.myProposal.status !== 'Chosen') {
    throw new ApiError('Este pedido não possui uma proposta sua aceita.', { status: 404 })
  }
  if (detail.id?.toLowerCase() !== id.toLowerCase() || !nonempty(detail.title)
    || !nonempty(detail.customerFirstName) || !optionalText(detail.location) || typeof detail.description !== 'string'
    || !Object.hasOwn(statuses, detail.status) || !validProposal(detail.myProposal)
    || detail.myProposal.orderId.toLowerCase() !== id.toLowerCase()
    || detail.myProposal.orderStatus !== detail.status) throw invalid()
  return toOrder(detail)
}

export async function getMyOrders({ auth = authSession, signal } = {}) {
  const proposals = []
  const seen = new Set()
  let page = 1
  let totalPages
  do {
    const result = await auth.request(`/api/v1/provider/proposals?status=chosen&page=${page}&pageSize=50`, { signal })
    if (!result || !Array.isArray(result.items) || !result.items.every(validProposal)
      || result.page !== page || result.pageSize !== 50 || result.items.length > 50
      || !count(result.totalItems) || result.totalPages !== Math.ceil(result.totalItems / 50)
      || (totalPages !== undefined && result.totalPages !== totalPages)
      || result.items.length !== Math.min(50, Math.max(0, result.totalItems - (page - 1) * 50))) throw invalid()
    totalPages = result.totalPages
    for (const proposal of result.items) {
      const orderId = proposal.orderId.toLowerCase()
      if (seen.has(orderId)) throw invalid()
      seen.add(orderId)
      proposals.push(proposal)
    }
    page++
  } while (page <= totalPages)

  // The existing list API omits customer names; hydrate through the authorized detail endpoint.
  // Bound concurrency to avoid opening one simultaneous request per order.
  const orders = new Array(proposals.length)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(4, proposals.length) }, async () => {
    while (next < proposals.length) {
      if (signal?.aborted) throw new DOMException('Solicitação cancelada.', 'AbortError')
      const index = next++
      const order = await getMyOrder(proposals[index].orderId, { auth, signal })
      if (order.proposalId.toLowerCase() !== proposals[index].id.toLowerCase()) throw invalid()
      orders[index] = order
    }
  }))
  return orders
}

export async function getProviderSummary({ auth = authSession, signal } = {}) {
  const result = await auth.request('/api/v1/provider/summary', { signal })
  if (!result || !count(result.newOrdersLast24h) || !count(result.compatibleOpenOrders)
    || !result.proposals || !['total', 'sent', 'viewed', 'chosen', 'notChosen'].every(field => count(result.proposals[field]))
    || result.proposals.total !== result.proposals.sent + result.proposals.viewed + result.proposals.chosen + result.proposals.notChosen) throw invalid()
  return result
}

export function loadChatDraft(id) {
  try { return localStorage.getItem(`resolvai:order-draft:${id}`) || '' }
  catch { return '' }
}

export function saveChatDraft(id, text) {
  localStorage.setItem(`resolvai:order-draft:${id}`, text)
}

// Photo blobs use IndexedDB so they do not fill the localStorage quota.
function openPhotoDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('resolvai-order-photos', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('photos', { keyPath: 'id' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('Armazenamento de fotos indisponível.'))
  })
}

async function photoTransaction(mode, operation) {
  const database = await openPhotoDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction('photos', mode)
      const request = operation(transaction.objectStore('photos'))
      transaction.oncomplete = () => resolve(request?.result)
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    database.close()
  }
}

export async function loadOrderPhotos(orderId) {
  const photos = await photoTransaction('readonly', (store) => store.getAll())
  return photos.filter((photo) => photo.orderId === orderId).sort((a, b) => a.createdAt - b.createdAt)
}

export function addOrderPhotos(orderId, files) {
  return photoTransaction('readwrite', (store) => {
    files.forEach((file) => store.add({
      id: crypto.randomUUID(), orderId, name: file.name, file, createdAt: Date.now(),
    }))
  })
}

export function deleteOrderPhoto(id) {
  return photoTransaction('readwrite', (store) => store.delete(id))
}
