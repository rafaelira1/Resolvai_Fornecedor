import { useEffect, useRef, useState } from 'react'
import { addOrderPhotos, deleteOrderPhoto, loadOrderPhotos } from '../services/orders'
import OrderIcon from './OrderIcon'
import OrderDialog from './OrderDialog'

const maxPhotos = 8
const maxSize = 5 * 1024 * 1024
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']

function OrderPhotos({ orderId, readOnly }) {
  const [photos, setPhotos] = useState([])
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [preview, setPreview] = useState(null)
  const urls = useRef([])

  function displayPhotos(saved) {
    urls.current.forEach((url) => URL.revokeObjectURL(url))
    const next = saved.map((photo) => ({ ...photo, url: URL.createObjectURL(photo.file) }))
    urls.current = next.map((photo) => photo.url)
    setPhotos(next)
  }

  useEffect(() => {
    let active = true
    loadOrderPhotos(orderId)
      .then((saved) => { if (active) displayPhotos(saved) })
      .catch(() => { if (active) setError('Não foi possível carregar as fotos salvas neste navegador.') })
      .finally(() => { if (active) setBusy(false) })
    return () => {
      active = false
      urls.current.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [orderId])

  async function addPhotos(event) {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (!files.length) return
    setError('')
    setNotice('')
    if (photos.length + files.length > maxPhotos) {
      setError(`Você pode adicionar até ${maxPhotos} fotos por pedido.`)
      return
    }
    if (files.some((file) => !allowedTypes.includes(file.type) || file.size > maxSize || !file.size)) {
      setError('Selecione imagens JPG, PNG ou WebP de até 5 MB cada.')
      return
    }
    setBusy(true)
    try {
      // Decode before persisting: a renamed file is not necessarily an image.
      await Promise.all(files.map(async (file) => {
        const bitmap = await createImageBitmap(file)
        bitmap.close()
      }))
      await addOrderPhotos(orderId, files)
      displayPhotos(await loadOrderPhotos(orderId))
      setNotice(`${files.length === 1 ? 'Foto salva' : 'Fotos salvas'} neste navegador.`)
    } catch {
      setError('Não foi possível salvar as fotos. Verifique os arquivos e o espaço disponível no navegador.')
    } finally {
      setBusy(false)
    }
  }

  async function removePhoto(id) {
    setBusy(true)
    setError('')
    try {
      await deleteOrderPhoto(id)
      displayPhotos(await loadOrderPhotos(orderId))
      setNotice('Foto removida.')
    } catch {
      setError('Não foi possível remover a foto. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="orders-panel orders-photos" aria-labelledby="order-photos-title">
      <h2 id="order-photos-title"><OrderIcon name="camera" />Fotos de progresso <span>{photos.length}/{maxPhotos}</span></h2>
      {photos.length > 0 && <div className="orders-photo-grid">{photos.map((photo) => (
        <div className="orders-photo" key={photo.id}>
          <button type="button" onClick={() => setPreview(photo)} aria-label={`Ampliar foto ${photo.name}`}><img src={photo.url} alt={photo.name} /></button>
          {!readOnly && <button className="orders-photo-remove" type="button" disabled={busy} onClick={() => removePhoto(photo.id)} aria-label={`Remover foto ${photo.name}`}><OrderIcon name="close" /></button>}
        </div>
      ))}</div>}
      {!readOnly && <label className={`orders-upload ${busy || photos.length >= maxPhotos ? 'disabled' : ''}`}>
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy || photos.length >= maxPhotos} onChange={addPhotos} aria-label="Adicionar fotos do andamento do serviço" />
        <OrderIcon name="camera" />
        <span>{busy ? 'Carregando fotos...' : photos.length >= maxPhotos ? 'Limite de fotos atingido' : 'Enviar fotos do andamento do serviço'}</span>
        <small>Fotos protegem você em caso de disputa</small>
      </label>}
      {readOnly && photos.length === 0 && <p className="orders-empty">Nenhuma foto registrada para este serviço.</p>}
      {!readOnly && <p className="orders-upload-help">JPG, PNG ou WebP · Até 5 MB por foto</p>}
      <p className="orders-local-note">As fotos ficam salvas apenas neste navegador.</p>
      {error && <p className="orders-error" role="alert">{error}</p>}
      {notice && <p className="orders-feedback" role="status">{notice}</p>}
      {preview && <OrderDialog title="Foto de progresso" onClose={() => setPreview(null)}><img className="orders-photo-preview" src={preview.url} alt={preview.name} /><p className="orders-dialog-subtitle">{preview.name}</p></OrderDialog>}
    </section>
  )
}

export default OrderPhotos
