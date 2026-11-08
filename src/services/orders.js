import { restoreOrders } from '../data/orders.js'

const storageKey = 'resolvai:orders:v1'

export function loadOrders() {
  try {
    return restoreOrders(JSON.parse(localStorage.getItem(storageKey)))
  } catch {
    return restoreOrders(null)
  }
}

export function saveOrder(order) {
  const current = loadOrders().map((item) => item.id === order.id ? order : item)
  localStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(current.map((item) => [item.id, {
    status: item.status, completionRequestedAt: item.completionRequestedAt,
  }]))))
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
