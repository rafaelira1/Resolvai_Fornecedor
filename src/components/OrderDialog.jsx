import { useEffect, useRef } from 'react'
import OrderIcon from './OrderIcon'

function OrderDialog({ title, onClose, children }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    const previousFocus = document.activeElement
    dialog.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [])

  return (
    <dialog className="orders-dialog" ref={ref} aria-labelledby="order-dialog-title" onCancel={(event) => { event.preventDefault(); onClose() }}>
      <header><h2 id="order-dialog-title">{title}</h2><button className="orders-icon-button" type="button" onClick={onClose} aria-label="Fechar"><OrderIcon name="close" /></button></header>
      {children}
    </dialog>
  )
}

export default OrderDialog
