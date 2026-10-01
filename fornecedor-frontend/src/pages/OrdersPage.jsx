import { useEffect, useState } from 'react'
import ProviderSidebar from '../components/ProviderSidebar'
import OrderIcon from '../components/OrderIcon'
import OrderChatDialog from '../components/OrderChatDialog'
import OrdersMobileNav from '../components/OrdersMobileNav'
import { formatOrderCurrency, orderStatuses } from '../data/orders'
import { loadOrders } from '../services/orders'
import './OrdersPage.css'

function OrderCard({ order, onChat }) {
  const completed = order.status === 'completed'
  return (
    <article className={`orders-card ${order.status}`}>
      <div className="orders-card-heading">
        <h3><a href={`/pedidos/detalhes?id=${order.id}`}>{order.title}</a></h3>
        <span className={`orders-badge ${order.status}`}>{orderStatuses[order.status].label}</span>
      </div>
      <p className="orders-card-meta"><span><OrderIcon name="user" />{order.customer}</span><span className="orders-meta-dot" aria-hidden="true">·</span><span><OrderIcon name="pin" />{order.neighborhood}</span></p>
      <p className="orders-card-meta">
        <OrderIcon name={completed ? 'check' : 'calendar'} />
        {completed ? `Concluído ${order.completedAt} · Avaliação: ${order.rating.toFixed(1)}` : `Prazo: ${order.deadline} · Iniciado: ${order.startedAt}`}
        {completed && <OrderIcon name="star" />}
      </p>
      {order.status === 'awaiting_confirmation' && <p className="orders-pending-copy">Aguardando o cliente confirmar a conclusão.</p>}
      <footer>
        <strong className="orders-card-value">{formatOrderCurrency(order.value)}{completed && ' recebido'}</strong>
        {!completed && <button className="orders-button secondary compact" type="button" onClick={() => onChat(order)} aria-label={`Chat com ${order.customer}`}><OrderIcon name="chat" />Chat</button>}
        {completed && <a className="orders-detail-link" href={`/pedidos/detalhes?id=${order.id}`} aria-label={`Ver detalhes de ${order.title}`}><OrderIcon name="next" /></a>}
      </footer>
    </article>
  )
}

function OrdersPage() {
  const [orders, setOrders] = useState(loadOrders)
  const [chatOrder, setChatOrder] = useState(null)
  const active = orders.filter((order) => order.status !== 'completed')
  const completed = orders.filter((order) => order.status === 'completed')

  useEffect(() => {
    document.title = 'Meus Pedidos | ResolvAI Fornecedor'
    const refresh = () => setOrders(loadOrders())
    window.addEventListener('storage', refresh)
    window.addEventListener('pageshow', refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('pageshow', refresh)
    }
  }, [])

  return (
    <div className="orders-page">
      <ProviderSidebar activePage="orders" />
      <main className="orders-content">
        <header className="orders-heading">
          <div><h1>Meus Pedidos <OrderIcon name="tool" /></h1><p>Serviços aceitos e em execução</p></div>
          <span className="orders-active-count">{active.length} {active.length === 1 ? 'pedido ativo' : 'pedidos ativos'}</span>
        </header>

        <section className="orders-section" aria-labelledby="orders-active-title">
          <h2 id="orders-active-title">Em andamento <span>{active.length}</span></h2>
          <div className="orders-card-grid">{active.map((order) => <OrderCard key={order.id} order={order} onChat={setChatOrder} />)}</div>
          {active.length === 0 && <p className="orders-empty">Você não tem serviços em andamento. <a href="/oportunidades">Explorar oportunidades</a></p>}
        </section>
        <section className="orders-section" aria-labelledby="orders-completed-title">
          <h2 id="orders-completed-title">Concluídos <span>{completed.length}</span></h2>
          <div className="orders-card-grid">{completed.map((order) => <OrderCard key={order.id} order={order} onChat={setChatOrder} />)}</div>
          {completed.length === 0 && <p className="orders-empty">Seus serviços concluídos aparecerão aqui.</p>}
        </section>
      </main>
      <OrdersMobileNav />
      {chatOrder && <OrderChatDialog order={chatOrder} onClose={() => setChatOrder(null)} />}
    </div>
  )
}

export default OrdersPage
