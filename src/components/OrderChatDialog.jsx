import { useState } from 'react'
import OrderDialog from './OrderDialog'
import { loadChatDraft, saveChatDraft } from '../services/orders'

function OrderChatDialog({ order, onClose }) {
  const [draft, setDraft] = useState(() => loadChatDraft(order.id))
  const [notice, setNotice] = useState('')

  function saveDraft(event) {
    event.preventDefault()
    try {
      saveChatDraft(order.id, draft.trim())
      setNotice('Rascunho salvo neste navegador. A mensagem ainda não foi enviada.')
    } catch {
      setNotice('Não foi possível salvar o rascunho. Copie a mensagem antes de fechar.')
    }
  }

  return (
    <OrderDialog title={`Chat com ${order.customer}`} onClose={onClose}>
      <p className="orders-dialog-subtitle">{order.title}</p>
      <p className="orders-notice">O chat ainda não está conectado. Você pode preparar uma mensagem e salvar o rascunho neste navegador.</p>
      <form onSubmit={saveDraft}>
        <label className="orders-message-label" htmlFor="order-message">Sua mensagem</label>
        <textarea id="order-message" value={draft} maxLength={2000} rows={5} placeholder="Escreva sua mensagem para o cliente..." onChange={(event) => { setDraft(event.target.value); setNotice('') }} />
        {notice && <p className="orders-feedback" role="status">{notice}</p>}
        <div className="orders-dialog-actions"><button className="orders-button primary" type="submit">Salvar rascunho</button></div>
      </form>
    </OrderDialog>
  )
}

export default OrderChatDialog
