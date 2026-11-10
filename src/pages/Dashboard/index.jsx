import { useEffect } from 'react'
import OrderIcon from '../../components/OrderIcon'
import HouseIllustration from '../../components/dashboard/HouseIllustration'
import { formatOrderCurrency, groupOrders, orderStatuses } from '../../data/orders'
import { getMyOrders, getProviderSummary } from '../../services/orders'
import { getOpportunities, formatOpportunityDate } from '../../services/opportunities'
import { useProviderData } from '../../hooks/useProviderData'
import { useProviderSession } from '../../hooks/useProviderSession'
import { providerCacheKeys } from '../../services/providerCacheData'
import { prefetchOpportunity } from '../../services/opportunityPrefetch'
import '../../styles/dashboard.css'

const loadRecentOpportunities = options => getOpportunities({ ...options, pageSize: 4, sort: 'recent' })

function SummaryCard({ label, value, detail, color, icon }) {
  return <article className={`home-summary-card home-summary-card--${color}`}><div className="home-summary-top"><span>{label}</span><span className="home-summary-icon"><OrderIcon name={icon} /></span></div><strong>{value}</strong><small>{detail}</small></article>
}

function RequestError({ error, reload }) {
  return <div className="home-request-message" role="alert"><p>{error.message}</p><button className="home-secondary-button" type="button" onClick={reload}>Tentar novamente</button></div>
}

function HomePage() {
  const session = useProviderSession()
  const displayName = session?.profile?.nomeExibicao || session?.user?.name || ''
  const orders = useProviderData(getMyOrders, { cacheKey: providerCacheKeys.orders })
  const summary = useProviderData(getProviderSummary, { cacheKey: providerCacheKeys.summary })
  const opportunities = useProviderData(loadRecentOpportunities, { cacheKey: providerCacheKeys.opportunities({ pageSize: 4 }) })
  const { active, completed } = groupOrders(orders.data ?? [])
  const totals = summary.data
  const cards = [
    { label: 'Pedidos ativos', value: orders.data ? active.length : '—', detail: 'Propostas aceitas e serviços em andamento', color: 'orange', icon: 'tool' },
    { label: 'Serviços concluídos', value: orders.data ? completed.length : '—', detail: 'Pedidos com conclusão registrada', color: 'green', icon: 'check' },
    { label: 'Propostas ativas', value: totals ? totals.proposals.sent + totals.proposals.viewed : '—', detail: totals ? `${totals.proposals.viewed} visualizadas e ${totals.proposals.sent} enviadas` : 'Aguardando consulta', color: 'amber', icon: 'document' },
    { label: 'Pedidos compatíveis', value: totals ? totals.compatibleOpenOrders : '—', detail: 'Abertos na sua especialidade e cidade', color: 'purple', icon: 'pin' },
  ]
  useEffect(() => { document.title = 'Home | ResolvAI Fornecedor' }, [])

  return (
    <div className="provider-home">

      <div className="home-content">
        <header className="home-welcome">
          <p>Visão geral</p><h1>Olá, {displayName}!</h1>
          <span>{totals ? `${totals.compatibleOpenOrders} pedidos abertos compatíveis com seu perfil.` : 'Acompanhe seus pedidos e oportunidades.'}</span>
        </header>
        <section className="home-welcome-banner" aria-labelledby="provider-welcome-title">
          <div className="home-hero-copy"><span className="home-hero-kicker">Seu talento. Novas oportunidades.</span><h2 id="provider-welcome-title">Seu próximo serviço.<br /><span>Começa com uma boa proposta.</span></h2><p>Encontre pedidos na sua especialidade e acompanhe cada etapa do seu trabalho em um só lugar.</p><a className="home-hero-button" href="/oportunidades"><OrderIcon name="document" />Explorar oportunidades<OrderIcon name="next" /></a></div>
          <HouseIllustration />
        </section>
        <section className="home-summary" aria-label="Resumo da conta">
          {cards.map(card => <SummaryCard key={card.label} {...card} />)}
        </section>
        {summary.loading && <p className="home-request-message" role="status">Carregando resumo…</p>}
        {summary.error && <RequestError error={summary.error} reload={summary.reload} />}

        <section className="home-table-card" aria-labelledby="opportunities-title">
          <header className="home-card-header"><div><p>Novos pedidos</p><h2 id="opportunities-title">Oportunidades recentes</h2></div><a href="/oportunidades">Ver todas</a></header>
          {opportunities.loading && <p className="home-request-message" role="status">Carregando oportunidades…</p>}
          {opportunities.error && <RequestError error={opportunities.error} reload={opportunities.reload} />}
          {opportunities.data && (opportunities.data.items.length === 0
            ? <p className="home-request-message">Nenhuma oportunidade disponível para suas especialidades.</p>
            : <div className="home-table-scroll"><div className="home-data-table opportunities-table" role="table" aria-label="Oportunidades recentes">
              <div className="home-table-row home-table-head" role="row"><span role="columnheader">Pedido</span><span role="columnheader">Categoria</span><span role="columnheader">Publicado em</span><span role="columnheader">Propostas</span><span role="columnheader">Ação</span></div>
              {opportunities.data.items.map(item => <div className="home-table-row" role="row" key={item.id}>
                <div className="home-request-title" role="cell"><strong>{item.title}</strong><small>{item.location || 'Local não informado'}</small></div>
                <div role="cell"><span className="home-category">{item.category}</span></div>
                <span role="cell">{formatOpportunityDate(item.createdAt)}</span>
                <span role="cell">{item.proposalsCount}</span>
                <div role="cell"><a className="home-action-button" href={`/oportunidades/detalhes?id=${item.id}`} onMouseEnter={() => prefetchOpportunity(item.id)} onFocus={() => prefetchOpportunity(item.id)} onPointerDown={() => prefetchOpportunity(item.id)}>Ver</a></div>
              </div>)}
            </div></div>)}
        </section>

        <section className="home-table-card" aria-labelledby="active-orders-title">
          <header className="home-card-header"><div><p>Serviços aceitos</p><h2 id="active-orders-title">Pedidos em acompanhamento</h2></div><a href="/pedidos">{orders.data ? `Ver todos (${active.length} ativos)` : 'Ver todos'}</a></header>
          {orders.loading && <p className="home-request-message" role="status">Carregando seus pedidos…</p>}
          {orders.error && <RequestError error={orders.error} reload={orders.reload} />}
          {orders.data && (active.length === 0 ? <p className="home-request-message">Você não tem pedidos aceitos ou em andamento.</p>
            : <div className="home-table-scroll"><div className="home-data-table active-orders-table" role="table" aria-label="Pedidos em acompanhamento">
              <div className="home-table-row home-table-head" role="row"><span role="columnheader">Pedido</span><span role="columnheader">Cliente</span><span role="columnheader">Prazo</span><span role="columnheader">Status</span><span role="columnheader">Local</span><span role="columnheader">Valor</span><span role="columnheader">Ação</span></div>
              {active.slice(0, 5).map(order => <div className="home-table-row" role="row" key={order.id}>
                <strong className="home-order-title" role="cell">{order.title}</strong><span role="cell">{order.customer}</span><span role="cell">{order.deadline}</span>
                <div role="cell"><span className={`home-order-status ${order.status}`}>{orderStatuses[order.status].label}</span></div>
                <span role="cell">{order.location}</span><strong className="home-value" role="cell">{formatOrderCurrency(order.value)}</strong>
                <div role="cell"><a className="home-secondary-button" href={`/pedidos/detalhes?id=${order.id}`}>Detalhes</a></div>
              </div>)}
            </div></div>)}
        </section>
      </div>
    </div>
  )
}

export default HomePage
