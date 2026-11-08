import { useEffect } from 'react'
import ProviderSidebar from '../components/ProviderSidebar'
import { opportunities, opportunityDetails } from '../data/opportunities'
import './OrderDetailsPage.css'

const clients = [
  'Ana Rodrigues', 'Ricardo Mendes', 'Mariana Costa', 'Paulo Nogueira', 'Juliana Alves',
  'Fernando Lima', 'Camila Freitas', 'Roberto Dias', 'Larissa Martins', 'Eduardo Rocha',
]

const photoIcons = ['faucet', 'droplet', 'wall', 'search', 'paint']

function DetailIcon({ name }) {
  const icons = {
    pin: <><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" /><circle cx="12" cy="10" r="2" /></>,
    calendar: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    chat: <path d="M5 18.5 4 21l3.8-1.5A9 9 0 1 0 5 18.5Z" />,
    check: <path d="m5 12 4 4L19 6" />,
    warning: <><path d="M12 4 3.5 19h17L12 4Z" /><path d="M12 9v4M12 16h.01" /></>,
    arrow: <path d="m14 6-6 6 6 6" />,
    pencil: <><path d="m4 20 4-1 10-10-3-3L5 16l-1 4Z" /><path d="m14 7 3 3" /></>,
    star: <path d="m12 3 2.6 5.3 5.9.8-4.2 4.1 1 5.8-5.3-2.7L6.7 19l1-5.8-4.2-4.1 5.9-.8L12 3Z" />,
    faucet: <><path d="M5 12h12v6H5zM9 8h4v4M7 8h8M11 5h6v3" /><path d="M17 14h3v3" /></>,
    droplet: <path d="M12 3s-5 6.1-5 10a5 5 0 0 0 10 0c0-3.9-5-10-5-10Z" />,
    wall: <><path d="M3 5h18v14H3zM3 10h18M3 15h18M8 5v5M16 5v5M6 10v5M14 10v5M9 15v4M18 15v4" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></>,
    paint: <><path d="M4 5h12v5H4zM16 7h3v6h-7v3M12 15v6" /></>,
  }

  return <svg viewBox="0 0 24 24" aria-hidden="true">{icons[name]}</svg>
}

function OrderDetailsPage() {
  const requestedId = Number(new URLSearchParams(window.location.search).get('id'))
  const opportunity = opportunities.find((item) => item.id === requestedId) ?? opportunities[0]
  const details = opportunityDetails[opportunity.category] ?? opportunityDetails.Hidráulica
  const client = clients[(opportunity.id - 1) % clients.length]
  const region = opportunity.location.split(',')[0]
  const urgencyLabel = opportunity.urgency === 'Alta' ? 'Urgente' : opportunity.urgency === 'Média' ? 'Prioridade média' : 'Prazo flexível'
  const proposalLabel = `${opportunity.proposals} ${opportunity.proposals === 1 ? 'proposta enviada' : 'propostas enviadas'}`

  useEffect(() => {
    document.title = `${opportunity.title} | ResolvAI Fornecedor`
  }, [opportunity.title])

  return (
    <div className="order-details-page">
      <ProviderSidebar activePage="opportunities" />

      <main className="order-details-content">
        <header className="order-details-heading">
          <div>
            <h1>Detalhe do Pedido</h1>
            <p>Leia o escopo completo antes de enviar sua proposta.</p>
          </div>
          <a href="/oportunidades"><DetailIcon name="arrow" />Voltar ao Feed</a>
        </header>

        <div className="order-details-layout">
          <div className="order-details-main-column">
            <section className="order-detail-card order-scope-card" aria-labelledby="order-title">
              <div className="order-title-row">
                <h2 id="order-title">{opportunity.title}</h2>
                <span className={`order-urgency order-urgency-${opportunity.urgency.toLocaleLowerCase('pt-BR')}`}>{urgencyLabel}</span>
              </div>

              <div className="order-meta">
                <span><DetailIcon name="pin" />{opportunity.location}</span>
                <span><DetailIcon name="calendar" />Publicado {opportunity.postedAt}</span>
                <span><DetailIcon name="clock" />Prazo: {opportunity.deadline}</span>
                <span><DetailIcon name="chat" />{proposalLabel}</span>
              </div>

              <section className="order-ai-scope" aria-labelledby="ai-scope-title">
                <h3 id="ai-scope-title">Escopo gerado por IA</h3>
                <div className="order-ai-grid">
                  <div><span>Tipo do problema</span><strong>{details.problemType}</strong></div>
                  <div><span>Localização</span><strong>Área principal, acesso facilitado</strong></div>
                  <div><span>Área afetada</span><strong>{details.affectedArea}</strong></div>
                  <div><span>Orçamento estimado</span><strong className="estimate">{opportunity.estimate}</strong></div>
                </div>
              </section>

              <section className="order-description">
                <h3>Descrição do problema</h3>
                <p>{details.description}</p>
              </section>

              <section className="order-services">
                <h3>Serviços necessários</h3>
                <ul>
                  {details.services.map((service, index) => (
                    <li className={index === details.services.length - 1 ? 'optional' : ''} key={service}>
                      <span><DetailIcon name={index === details.services.length - 1 ? 'warning' : 'check'} /></span>
                      {service}
                    </li>
                  ))}
                </ul>
              </section>
            </section>

            <section className="order-detail-card order-photos-card" aria-labelledby="problem-photos-title">
              <header><h2 id="problem-photos-title">Fotos do problema (5)</h2></header>
              <div className="order-photo-grid">
                {photoIcons.map((icon, index) => (
                  <button className={`order-photo photo-${index + 1}`} type="button" aria-label={`Ampliar foto ${index + 1}`} key={icon}>
                    <DetailIcon name={icon} />
                    <span>Foto {index + 1}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <aside className="order-details-side-column">
            <section className="order-detail-card order-client-card" aria-labelledby="client-title">
              <h2 id="client-title">Informações do cliente</h2>
              <div className="order-client-identity">
                <span className="order-client-avatar" aria-hidden="true">{client[0]}</span>
                <div><strong>{client}</strong><small><DetailIcon name="star" />Cliente verificado · 4 contratos concluídos</small></div>
              </div>
              <dl>
                <div><dt>Histórico</dt><dd>4 serviços contratados</dd></div>
                <div><dt>Taxa de avaliação</dt><dd>100% avaliou</dd></div>
                <div><dt>Pagamentos</dt><dd>Sempre em dia</dd></div>
                <div><dt>Conta desde</dt><dd>Jan 2024</dd></div>
              </dl>
            </section>

            <section className="order-detail-card order-match-card" aria-labelledby="match-title">
              <h2 id="match-title">Análise de compatibilidade IA</h2>
              <div className="order-match-score">
                <strong>{opportunity.compatibility}%</strong>
                <span>Compatibilidade com seu perfil</span>
              </div>
              <ul>
                <li><span><DetailIcon name="check" />Categoria: {opportunity.category}</span><strong>Match</strong></li>
                <li><span><DetailIcon name="check" />Região: {region}</span><strong>Match</strong></li>
                <li><span><DetailIcon name="check" />Valor no seu range</span><strong>Match</strong></li>
                <li className="partial"><span><DetailIcon name="warning" />Experiência relacionada</span><strong>Parcial</strong></li>
              </ul>
            </section>

            <div className="order-action-panel">
              <a className="order-proposal-button" href={`/oportunidades/proposta?id=${opportunity.id}`}><DetailIcon name="pencil" />Enviar proposta</a>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}

export default OrderDetailsPage
