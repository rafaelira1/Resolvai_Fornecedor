import { useCallback, useEffect } from 'react'
import OrderIcon from '../../components/OrderIcon'
import { formatOrderCurrency, orderStatuses } from '../../data/orders'
import { getMyOrder } from '../../services/orders'
import { useProviderData } from '../../hooks/useProviderData'
import { providerCacheKeys } from '../../services/providerCacheData'
import '../../styles/orders.css'

function ServiceOrderPage() {
  const id = new URLSearchParams(window.location.search).get('id')
  const load = useCallback(options => getMyOrder(id, options), [id])
  const { data: order, loading, error, reload } = useProviderData(load, { cacheKey: providerCacheKeys.order(id) })
  useEffect(() => { document.title = `${order?.title || 'Detalhes do pedido'} | ResolvAI Fornecedor` }, [order?.title])

  return (
    <div className="orders-page orders-service-page">

      <div className="orders-content">
        <header className="orders-service-heading">
          <a className="orders-back" href="/pedidos" aria-label="Voltar para Meus Pedidos"><OrderIcon name="arrow" /></a>
          <div><h1>Detalhes do pedido</h1><p>Acompanhe os dados do serviço e da proposta aceita</p></div>
        </header>
        {loading && <p className="orders-empty" role="status">Carregando pedido…</p>}
        {error && <div className="orders-error" role="alert"><p>{error.message}</p><button className="orders-button secondary" type="button" onClick={reload}>Tentar novamente</button></div>}
        {order && <>
          <section className="orders-service-summary" aria-label="Resumo do serviço">
            <div className="orders-summary-top"><h2>{order.title}</h2><span className={`orders-badge ${order.status}`}>{orderStatuses[order.status].label}</span></div>
            <p><OrderIcon name="pin" />{order.location}<span>·</span>Cliente: {order.customer}</p>
            <div className="orders-summary-facts"><strong>{formatOrderCurrency(order.value)}</strong><span><OrderIcon name="calendar" />Prazo: {order.deadline}</span><span><OrderIcon name="shield" />Garantia: {order.guarantee}</span></div>
          </section>
          <div className="orders-service-grid">
            <section className="orders-panel" aria-labelledby="order-status-title"><h2 id="order-status-title">Situação do pedido</h2><p>{orderStatuses[order.status].description}</p><p className="orders-local-note">O status é atualizado conforme o registro do serviço.</p></section>
            <section className="orders-panel" aria-labelledby="order-scope-title"><h2 id="order-scope-title">Escopo do pedido</h2><p className="orders-contract-scope">{order.scope || 'Descrição não informada.'}</p>
              {order.proposalDescription && <><h3>Proposta aceita</h3><p className="orders-contract-scope">{order.proposalDescription}</p></>}
            </section>
          </div>
          <p className="orders-notice">Chat, contrato assinado e solicitação de conclusão ainda não estão disponíveis nesta tela.</p>
          <button className="orders-button secondary" type="button" onClick={reload}>Atualizar pedido</button>
        </>}
      </div>

    </div>
  )
}

export default ServiceOrderPage
