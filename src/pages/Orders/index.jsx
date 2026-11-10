import { useEffect } from 'react'
import OrderIcon from '../../components/OrderIcon'
import { formatOrderCurrency, groupOrders, orderStatuses } from '../../data/orders'
import { getMyOrders } from '../../services/orders'
import { useProviderData } from '../../hooks/useProviderData'
import { providerCacheKeys } from '../../services/providerCacheData'
import '../../styles/orders.css'

function OrderCard({ order }) {
  return (
    <article className={`orders-card ${order.status}`}>
      <div className="orders-card-heading">
        <h3><a href={`/pedidos/detalhes?id=${order.id}`}>{order.title}</a></h3>
        <span className={`orders-badge ${order.status}`}>{orderStatuses[order.status].label}</span>
      </div>
      <p className="orders-card-meta"><span><OrderIcon name="user" />{order.customer}</span><span className="orders-meta-dot" aria-hidden="true">·</span><span><OrderIcon name="pin" />{order.location}</span></p>
      <p className="orders-card-meta"><OrderIcon name="calendar" />Prazo acordado: {order.deadline}</p>
      <footer>
        <strong className="orders-card-value">{formatOrderCurrency(order.value)}</strong>
        <a className="orders-button secondary compact" href={`/pedidos/detalhes?id=${order.id}`}>Ver detalhes</a>
      </footer>
    </article>
  )
}

function OrdersPage() {
  const { data, loading, error, reload } = useProviderData(getMyOrders, { cacheKey: providerCacheKeys.orders })
  const { active, completed, cancelled } = groupOrders(data ?? [])
  useEffect(() => { document.title = 'Meus Pedidos | ResolvAI Fornecedor' }, [])

  return (
    <div className="orders-page">

      <div className="orders-content">
        <header className="orders-heading">
          <div><h1>Meus Pedidos <OrderIcon name="tool" /></h1><p>Pedidos em que sua proposta foi aceita</p></div>
          <button className="orders-button secondary compact" type="button" onClick={reload} disabled={loading}>Atualizar</button>
        </header>
        {loading && <p className="orders-empty" role="status">Carregando seus pedidos…</p>}
        {error && <div className="orders-error" role="alert"><p>{error.message}</p><button className="orders-button secondary" type="button" onClick={reload}>Tentar novamente</button></div>}
        {data && (!error || data.length > 0) && <>
          <p className="orders-active-count">{active.length} {active.length === 1 ? 'pedido ativo' : 'pedidos ativos'}</p>
          <section className="orders-section" aria-labelledby="orders-active-title">
            <h2 id="orders-active-title">Aceitos e em andamento <span>{active.length}</span></h2>
            <div className="orders-card-grid">{active.map(order => <OrderCard key={order.id} order={order} />)}</div>
            {active.length === 0 && <p className="orders-empty">Você não tem pedidos aceitos ou em andamento. <a href="/oportunidades">Explorar oportunidades</a></p>}
          </section>
          <section className="orders-section" aria-labelledby="orders-completed-title">
            <h2 id="orders-completed-title">Concluídos <span>{completed.length}</span></h2>
            <div className="orders-card-grid">{completed.map(order => <OrderCard key={order.id} order={order} />)}</div>
            {completed.length === 0 && <p className="orders-empty">Seus serviços concluídos aparecerão aqui.</p>}
          </section>
          {cancelled.length > 0 && <section className="orders-section" aria-labelledby="orders-cancelled-title">
            <h2 id="orders-cancelled-title">Cancelados <span>{cancelled.length}</span></h2>
            <div className="orders-card-grid">{cancelled.map(order => <OrderCard key={order.id} order={order} />)}</div>
          </section>}
        </>}
      </div>

    </div>
  )
}

export default OrdersPage
