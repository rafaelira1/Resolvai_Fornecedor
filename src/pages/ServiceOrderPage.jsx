import { useEffect, useState } from 'react'
import ProviderSidebar from '../components/ProviderSidebar'
import OrderIcon from '../components/OrderIcon'
import OrderDialog from '../components/OrderDialog'
import OrderChatDialog from '../components/OrderChatDialog'
import OrderPhotos from '../components/OrderPhotos'
import OrdersMobileNav from '../components/OrdersMobileNav'
import { formatOrderCurrency, orderStatuses, requestOrderCompletion } from '../data/orders'
import { loadOrders, saveOrder } from '../services/orders'
import './OrdersPage.css'

function OrderProgress({ order }) {
  const current = order.status === 'completed' ? 4 : order.status === 'awaiting_confirmation' ? 3 : 2
  const steps = [
    ['Contrato assinado', 'Ambas as partes assinaram'],
    ['Pagamento confirmado', 'Valor retido em escrow'],
    ['Em execução', `Serviço iniciado · ${order.startedAt}`],
    ['Aguardando confirmação', order.status === 'completed' ? 'Conclusão confirmada pelo cliente' : 'Cliente confirma a conclusão'],
    ['Concluído', order.status === 'completed' ? 'Pagamento liberado' : 'Pagamento liberado após a confirmação'],
  ]

  return (
    <section className="orders-panel orders-progress" aria-labelledby="order-progress-title">
      <h2 id="order-progress-title">Progresso</h2>
      <ol className="orders-timeline">{steps.map(([title, description], index) => {
        const done = index < current || order.status === 'completed'
        const active = index === current && !done
        return <li key={title} className={done ? 'done' : active ? 'current' : ''} aria-current={active ? 'step' : undefined}>
          <span className="orders-timeline-dot" aria-hidden="true">{done && <OrderIcon name="check" />}</span>
          <div><strong>{title}</strong><p>{description}</p><span className="sr-only">{done ? 'Etapa concluída' : active ? 'Etapa atual' : 'Etapa pendente'}</span></div>
        </li>
      })}</ol>
    </section>
  )
}

function ServiceOrderPage() {
  const requestedId = new URLSearchParams(window.location.search).get('id')
  const [order, setOrder] = useState(() => loadOrders().find((item) => item.id === requestedId))
  const [dialog, setDialog] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const completed = order?.status === 'completed'
  const awaiting = order?.status === 'awaiting_confirmation'

  useEffect(() => {
    document.title = `${order?.title || 'Pedido não encontrado'} | ResolvAI Fornecedor`
    const refresh = () => setOrder(loadOrders().find((item) => item.id === requestedId))
    window.addEventListener('storage', refresh)
    return () => window.removeEventListener('storage', refresh)
  }, [order?.title, requestedId])

  function confirmCompletion() {
    setError('')
    try {
      const latest = loadOrders().find((item) => item.id === requestedId)
      const updated = requestOrderCompletion(latest)
      saveOrder(updated)
      setOrder(updated)
      setDialog(null)
      setNotice('Conclusão registrada neste navegador. O pedido aguarda a confirmação do cliente.')
    } catch {
      setError('Não foi possível salvar a conclusão. Verifique se o armazenamento do navegador está disponível e tente novamente.')
    }
  }

  return (
    <div className="orders-page orders-service-page">
      <ProviderSidebar activePage="orders" />
      <main className="orders-content">
        <header className="orders-service-heading">
          <a className="orders-back" href="/pedidos" aria-label="Voltar para Meus Pedidos"><OrderIcon name="arrow" /></a>
          <div><h1>{!order ? 'Pedido não encontrado' : completed ? 'Serviço Concluído' : awaiting ? 'Aguardando Confirmação' : 'Serviço em Andamento'}</h1><p>Acompanhe cada etapa do seu serviço</p></div>
        </header>
        {!order ? <div className="orders-empty orders-not-found"><OrderIcon name="document" /><h2>Não encontramos este pedido</h2><p>Confira seus serviços na lista de pedidos.</p><a className="orders-button primary" href="/pedidos">Ir para Meus Pedidos</a></div> : <>
          <section className="orders-service-summary" aria-label="Resumo do serviço">
            <div className="orders-summary-top"><h2>{order.title}</h2><span className={`orders-badge ${order.status}`}>{orderStatuses[order.status].label}</span></div>
            <p><OrderIcon name="pin" />{order.neighborhood}, {order.city}<span>·</span>Cliente: {order.customer}</p>
            <div className="orders-summary-facts">
              <strong>{formatOrderCurrency(order.value)}{completed && ' recebido'}</strong>
              <span><OrderIcon name="calendar" />Prazo: {order.deadline}</span>
              <span><OrderIcon name="shield" />Garantia: {order.guarantee}</span>
            </div>
          </section>

          {notice && <p className="orders-success" role="status"><OrderIcon name="check" />{notice}</p>}
          {awaiting && <div className="orders-notice orders-awaiting"><OrderIcon name="clock" /><div><strong>Aguardando confirmação do cliente</strong><p>A execução foi finalizada. O pagamento permanece retido até a confirmação da conclusão.</p></div></div>}
          {completed && <div className="orders-success"><OrderIcon name="check" /><span>Concluído {order.completedAt} · Pagamento liberado · Avaliação: {order.rating.toFixed(1)} ★</span></div>}

          <div className="orders-service-grid">
            <OrderProgress order={order} />
            <div className="orders-service-column">
              <OrderPhotos orderId={order.id} readOnly={completed} />
              <div className="orders-service-actions">
                <div className="orders-secondary-actions">
                  <button className="orders-button secondary" type="button" onClick={() => setDialog('chat')}><OrderIcon name="chat" />Chat com cliente</button>
                  <button className="orders-button secondary" type="button" onClick={() => setDialog('contract')}><OrderIcon name="document" />Ver contrato</button>
                </div>
                {!completed && <button className="orders-button complete" type="button" disabled={awaiting} onClick={() => { setError(''); setDialog('complete') }}><OrderIcon name={awaiting ? 'clock' : 'check'} />{awaiting ? 'Aguardando confirmação' : 'Marcar como concluído'}</button>}
                <p className="orders-local-note">Demonstração com dados de exemplo. Alterações salvas neste navegador.</p>
              </div>
            </div>
          </div>
        </>}
      </main>
      <OrdersMobileNav />

      {dialog === 'chat' && <OrderChatDialog order={order} onClose={() => setDialog(null)} />}
      {dialog === 'contract' && <OrderDialog title="Resumo do contrato" onClose={() => setDialog(null)}>
        <p className="orders-dialog-subtitle">Pedido #{order.id.padStart(4, '0')} · {order.title}</p>
        <dl className="orders-contract-data">
          <div><dt>Cliente</dt><dd>{order.customer}</dd></div>
          <div><dt>Local</dt><dd>{order.neighborhood}, {order.city}</dd></div>
          <div><dt>Valor acordado</dt><dd>{formatOrderCurrency(order.value)}</dd></div>
          <div><dt>Prazo de execução</dt><dd>{order.deadline}</dd></div>
          <div><dt>Garantia</dt><dd>{order.guarantee}</dd></div>
          <div><dt>Pagamento</dt><dd>{completed ? 'Liberado' : 'Retido até a confirmação do cliente'}</dd></div>
        </dl>
        <h3 className="orders-contract-title">Escopo do serviço</h3><p className="orders-contract-scope">{order.scope}</p>
        <p className="orders-notice">Resumo demonstrativo. O documento assinado estará disponível quando o serviço de contratos for conectado.</p>
        <div className="orders-dialog-actions"><button className="orders-button secondary" type="button" onClick={() => setDialog(null)}>Fechar</button></div>
      </OrderDialog>}
      {dialog === 'complete' && <OrderDialog title="Concluir execução do serviço?" onClose={() => setDialog(null)}>
        <p className="orders-dialog-subtitle">{order.title}</p>
        <p className="orders-contract-scope">Confirme que todas as atividades combinadas foram realizadas. O pedido passará para <strong>Aguardando confirmação</strong> e o pagamento será liberado após a confirmação do cliente.</p>
        <p className="orders-notice">Nesta demonstração, a alteração fica salva neste navegador. Nenhuma notificação ou pagamento será enviado.</p>
        {error && <p className="orders-error" role="alert">{error}</p>}
        <div className="orders-dialog-actions"><button className="orders-button secondary" type="button" onClick={() => setDialog(null)}>Continuar serviço</button><button className="orders-button complete" type="button" onClick={confirmCompletion}>Confirmar conclusão</button></div>
      </OrderDialog>}
    </div>
  )
}

export default ServiceOrderPage
