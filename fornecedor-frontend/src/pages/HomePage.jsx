import { useEffect } from 'react'
import './HomePage.css'

const summaryCards = [
  {
    label: 'Ganhos no mês',
    value: 'R$ 12.400',
    detail: '18% a mais que no mês anterior',
    color: 'orange',
  },
  {
    label: 'Taxa de conclusão',
    value: '94%',
    detail: '2 pontos acima do mês anterior',
    color: 'green',
  },
  {
    label: 'Propostas ativas',
    value: '3',
    detail: '1 visualizada e 2 enviadas',
    color: 'amber',
  },
  {
    label: 'Avaliação média',
    value: '4,9 / 5',
    detail: '0,1 ponto acima neste mês',
    color: 'purple',
  },
]

const recentOpportunities = [
  {
    id: 1,
    title: 'Infiltração no banheiro',
    location: 'Meireles, Fortaleza',
    postedAt: 'há 2 horas',
    category: 'Hidráulica',
    estimate: 'R$ 1.200–1.800',
    compatibility: 92,
  },
  {
    id: 2,
    title: 'Impermeabilização de laje',
    location: 'Aldeota, Fortaleza',
    postedAt: 'há 4 horas',
    category: 'Impermeabilização',
    estimate: 'R$ 3.500–5.000',
    compatibility: 85,
  },
  {
    id: 3,
    title: 'Pintura de sala e quartos',
    location: 'Cocó, Fortaleza',
    postedAt: 'há 6 horas',
    category: 'Pintura',
    estimate: 'R$ 2.000–2.800',
    compatibility: 71,
  },
  {
    id: 4,
    title: 'Reforma completa de banheiro',
    location: 'Papicu, Fortaleza',
    postedAt: 'há 9 horas',
    category: 'Alvenaria',
    estimate: 'R$ 8.000–12.000',
    compatibility: 55,
  },
]

const activeOrders = [
  {
    id: 1,
    title: 'Impermeabilização de garagem',
    customer: 'Ana Rodrigues',
    deadline: '22 de setembro',
    status: 'Em execução',
    progress: 68,
    value: 'R$ 4.200',
  },
  {
    id: 2,
    title: 'Instalação elétrica residencial',
    customer: 'Marcos Lima',
    deadline: '25 de setembro',
    status: 'Aguardando material',
    progress: 35,
    value: 'R$ 1.850',
  },
  {
    id: 3,
    title: 'Pintura de apartamento',
    customer: 'Carla Souza',
    deadline: '30 de setembro',
    status: 'Vistoria agendada',
    progress: 15,
    value: 'R$ 6.300',
  },
]

function SummaryCard({ label, value, detail, color }) {
  return (
    <article className={`home-summary-card home-summary-card--${color}`}>
      <strong>{value}</strong>
      <span>{label}</span>
      <small>{detail}</small>
    </article>
  )
}

function Compatibility({ value }) {
  return (
    <div className="home-compatibility" aria-label={`${value}% de compatibilidade`}>
      <span className="home-progress-track" aria-hidden="true">
        <span style={{ width: `${value}%` }} />
      </span>
      <strong>{value}%</strong>
    </div>
  )
}

function HomePage() {
  useEffect(() => {
    document.title = 'Home | ResolvAI Fornecedor'
  }, [])

  return (
    <div className="provider-home">
      <aside className="home-sidebar">
        <a className="home-brand" href="/home" aria-label="ResolvAI, página inicial">
          <span className="home-brand-mark" aria-hidden="true">R</span>
          <span className="home-brand-copy">
            <strong>ResolvAI</strong>
            <small>Fornecedor</small>
          </span>
        </a>

        <nav className="home-navigation" aria-label="Menu principal">
          <span>Menu</span>
          <a href="/home" aria-current="page">Home</a>
        </nav>

        <div className="home-account">
          <span className="home-account-initials" aria-hidden="true">CS</span>
          <span className="home-account-copy">
            <strong>Carlos Silva</strong>
            <small>Fornecedor verificado</small>
          </span>
          <a href="/login">Sair</a>
        </div>
      </aside>

      <main className="home-content">
        <header className="home-welcome">
          <p>Visão geral</p>
          <h1>Bom dia, Carlos!</h1>
          <span>Você tem 8 novos pedidos compatíveis com o seu perfil.</span>
        </header>

        <section className="home-summary" aria-label="Resumo da conta">
          {summaryCards.map((card) => (
            <SummaryCard key={card.label} {...card} />
          ))}
        </section>

        <section className="home-table-card" aria-labelledby="opportunities-title">
          <header className="home-card-header">
            <div>
              <p>Novos pedidos</p>
              <h2 id="opportunities-title">Oportunidades recentes</h2>
            </div>
            <a href="#todas-as-oportunidades">Ver todas</a>
          </header>

          <div className="home-table-scroll">
            <div className="home-data-table opportunities-table" role="table" aria-label="Oportunidades recentes">
              <div className="home-table-row home-table-head" role="row">
                <span role="columnheader">Pedido</span>
                <span role="columnheader">Categoria</span>
                <span role="columnheader">Valor estimado</span>
                <span role="columnheader">Compatibilidade</span>
                <span role="columnheader">Ação</span>
              </div>

              {recentOpportunities.map((opportunity) => (
                <div className="home-table-row" role="row" key={opportunity.id}>
                  <div className="home-request-title" role="cell">
                    <strong>{opportunity.title}</strong>
                    <small>{opportunity.location} · {opportunity.postedAt}</small>
                  </div>
                  <div role="cell">
                    <span className="home-category">{opportunity.category}</span>
                  </div>
                  <strong className="home-value" role="cell">{opportunity.estimate}</strong>
                  <Compatibility value={opportunity.compatibility} />
                  <div role="cell">
                    <button className="home-action-button" type="button">Ver</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="home-table-card" aria-labelledby="active-orders-title">
          <header className="home-card-header">
            <div>
              <p>Serviços contratados</p>
              <h2 id="active-orders-title">Pedidos em andamento</h2>
            </div>
            <span className="home-active-count">3 pedidos ativos</span>
          </header>

          <div className="home-table-scroll">
            <div className="home-data-table active-orders-table" role="table" aria-label="Pedidos em andamento">
              <div className="home-table-row home-table-head" role="row">
                <span role="columnheader">Pedido</span>
                <span role="columnheader">Cliente</span>
                <span role="columnheader">Prazo</span>
                <span role="columnheader">Status</span>
                <span role="columnheader">Progresso</span>
                <span role="columnheader">Valor</span>
                <span role="columnheader">Ação</span>
              </div>

              {activeOrders.map((order) => (
                <div className="home-table-row" role="row" key={order.id}>
                  <strong className="home-order-title" role="cell">{order.title}</strong>
                  <span role="cell">{order.customer}</span>
                  <span role="cell">{order.deadline}</span>
                  <div role="cell"><span className="home-order-status">{order.status}</span></div>
                  <div className="home-order-progress" role="cell" aria-label={`${order.progress}% concluído`}>
                    <span className="home-progress-track" aria-hidden="true">
                      <span style={{ width: `${order.progress}%` }} />
                    </span>
                    <strong>{order.progress}%</strong>
                  </div>
                  <strong className="home-value" role="cell">{order.value}</strong>
                  <div role="cell">
                    <button className="home-secondary-button" type="button">Detalhes</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default HomePage
