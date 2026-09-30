import { useEffect, useMemo, useState } from 'react'
import ProviderSidebar from '../components/ProviderSidebar'
import { opportunities } from '../data/opportunities'
import './ProposalPage.css'

const initialPortfolio = [
  { id: 'example-1', name: 'Reparo hidráulico concluído', tone: 'blue', icon: 'faucet' },
  { id: 'example-2', name: 'Impermeabilização de área', tone: 'green', icon: 'tool' },
]

function ProposalIcon({ name }) {
  const icons = {
    arrow: <path d="m14 6-6 6 6 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    upload: <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M5 14v5h14v-5" /></>,
    camera: <><path d="M4 7h4l1.5-2h5L16 7h4v12H4z" /><circle cx="12" cy="13" r="3" /></>,
    star: <path d="m12 3 2.6 5.3 5.9.8-4.2 4.1 1 5.8-5.3-2.7L6.7 19l1-5.8-4.2-4.1 5.9-.8L12 3Z" />,
    faucet: <><path d="M5 12h12v6H5zM9 8h4v4M7 8h8M11 5h6v3" /><path d="M17 14h3v3" /></>,
    tool: <path d="M14.5 6.5a4.5 4.5 0 0 0-5.8-5.4L11 3.5 8.5 6 6.1 3.7a4.5 4.5 0 0 0 5.4 5.8l7.1 7.1a1.7 1.7 0 1 0 2.4-2.4l-6.5-6.5Z" />,
  }

  return <svg viewBox="0 0 24 24" aria-hidden="true">{icons[name]}</svg>
}

function formatCurrency(digits) {
  if (!digits) return ''
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(digits) / 100)
}

function ProposalPage() {
  const requestedId = Number(new URLSearchParams(window.location.search).get('id'))
  const opportunity = opportunities.find((item) => item.id === requestedId) ?? opportunities[0]
  const [priceDigits, setPriceDigits] = useState('')
  const [deadline, setDeadline] = useState('3 dias')
  const [startDate, setStartDate] = useState('2026-10-15')
  const [description, setDescription] = useState('')
  const [materials, setMaterials] = useState('')
  const [guaranteePeriod, setGuaranteePeriod] = useState('90 dias')
  const [guaranteeType, setGuaranteeType] = useState('Reexecução gratuita')
  const [guaranteeConditions, setGuaranteeConditions] = useState('')
  const [portfolio, setPortfolio] = useState(initialPortfolio)
  const [validationAttempted, setValidationAttempted] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const formattedPrice = formatCurrency(priceDigits)
  const netValue = useMemo(() => Number(priceDigits || 0) * 0.9, [priceDigits])

  useEffect(() => {
    document.title = `Enviar proposta | ${opportunity.title}`
  }, [opportunity.title])

  function updatePrice(event) {
    setSubmitted(false)
    setPriceDigits(event.target.value.replace(/\D/g, '').slice(0, 9))
  }

  function addPortfolio(event) {
    const availableSlots = Math.max(0, 5 - portfolio.length)
    const additions = Array.from(event.target.files).slice(0, availableSlots).map((file, index) => ({
      id: `${file.name}-${file.lastModified}-${index}`,
      name: file.name,
      tone: index % 2 ? 'green' : 'blue',
      icon: 'camera',
    }))
    setPortfolio((current) => [...current, ...additions])
    event.target.value = ''
  }

  function submitProposal(event) {
    event.preventDefault()
    setValidationAttempted(true)
    if (!event.currentTarget.reportValidity()) return
    setSubmitted(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="proposal-page">
      <ProviderSidebar activePage="opportunities" />

      <main className="proposal-content">
        <header className="proposal-heading">
          <div>
            <h1>Enviar Proposta</h1>
            <p>Preencha os campos abaixo para montar sua proposta.</p>
          </div>
          <a href={`/oportunidades/detalhes?id=${opportunity.id}`}><ProposalIcon name="arrow" />Voltar ao Pedido</a>
        </header>

        {submitted && (
          <div className="proposal-success" role="status">
            <ProposalIcon name="check" />Proposta revisada e pronta para envio.
          </div>
        )}

        <form className={`proposal-layout ${validationAttempted ? 'validation-attempted' : ''}`} onSubmit={submitProposal} onInvalid={() => setValidationAttempted(true)}>
          <div className="proposal-form-column">
            <section className="proposal-card" aria-labelledby="values-title">
              <h2 id="values-title">Valores e prazo</h2>
              <div className="proposal-fields-grid">
                <label className="proposal-field">
                  <span>Valor total <b aria-hidden="true">*</b></span>
                  <input type="text" inputMode="numeric" value={formattedPrice} onChange={updatePrice} placeholder="R$ 0,00" required aria-required="true" />
                  <small className="proposal-field-error">Informe o valor total.</small>
                </label>
                <label className="proposal-field">
                  <span>Prazo de execução <b aria-hidden="true">*</b></span>
                  <select value={deadline} onChange={(event) => setDeadline(event.target.value)} required aria-required="true">
                    <option value="">Selecione o prazo</option>
                    {['1 dia', '2 dias', '3 dias', '5 dias', '7 dias', '10 dias', '15 dias', '30 dias'].map((item) => <option key={item}>{item}</option>)}
                  </select>
                  <small className="proposal-field-error">Selecione o prazo de execução.</small>
                </label>
                <label className="proposal-field wide">
                  <span>Data de início disponível</span>
                  <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                </label>
              </div>
            </section>

            <section className="proposal-card" aria-labelledby="description-title">
              <h2 id="description-title">Descrição da proposta</h2>
              <label className="proposal-field">
                <span>O que você vai fazer <b aria-hidden="true">*</b></span>
                <textarea rows="5" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descreva as etapas e o resultado do serviço" required aria-required="true" />
                <small className="proposal-field-error">Descreva o serviço que será realizado.</small>
              </label>
              <label className="proposal-field">
                <span>Materiais incluídos</span>
                <textarea rows="4" value={materials} onChange={(event) => setMaterials(event.target.value)} placeholder="Liste os materiais incluídos na proposta" />
              </label>
            </section>

            <section className="proposal-card" aria-labelledby="guarantee-title">
              <h2 id="guarantee-title">Garantia <span>(opcional)</span></h2>
              <div className="proposal-fields-grid">
                <label className="proposal-field">
                  <span>Prazo de garantia</span>
                  <select value={guaranteePeriod} onChange={(event) => setGuaranteePeriod(event.target.value)}>
                    <option value="">Selecione o prazo</option>
                    {['30 dias', '60 dias', '90 dias', '180 dias', '1 ano'].map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label className="proposal-field">
                  <span>Tipo de garantia</span>
                  <select value={guaranteeType} onChange={(event) => setGuaranteeType(event.target.value)}>
                    <option value="">Selecione o tipo</option>
                    <option>Reexecução gratuita</option>
                    <option>Reembolso do valor</option>
                    <option>Manutenção sem custo</option>
                  </select>
                </label>
                <label className="proposal-field wide">
                  <span>Condições da garantia</span>
                  <textarea rows="4" value={guaranteeConditions} onChange={(event) => setGuaranteeConditions(event.target.value)} placeholder="Explique o que a garantia cobre" />
                </label>
              </div>
            </section>

            <section className="proposal-card proposal-portfolio-card" aria-labelledby="portfolio-title">
              <h2 id="portfolio-title">Portfólio <span>(trabalhos similares)</span></h2>
              <label className="proposal-upload-area">
                <ProposalIcon name="camera" />
                <strong>Clique para adicionar fotos de serviços similares</strong>
                <span>Até 5 fotos · JPG ou PNG</span>
                <input type="file" accept="image/png,image/jpeg" multiple onChange={addPortfolio} disabled={portfolio.length >= 5} />
              </label>
              <div className="proposal-portfolio-grid">
                {portfolio.map((item) => (
                  <article className={`proposal-portfolio-item ${item.tone}`} key={item.id} title={item.name}>
                    <ProposalIcon name={item.icon} />
                    <span>{item.name}</span>
                  </article>
                ))}
                {portfolio.length < 5 && (
                  <label className="proposal-portfolio-add" aria-label="Adicionar foto ao portfólio">
                    <span>+</span>
                    <input type="file" accept="image/png,image/jpeg" multiple onChange={addPortfolio} />
                  </label>
                )}
              </div>
            </section>

            <button className="proposal-submit-button" type="submit"><ProposalIcon name="upload" />Enviar proposta</button>
          </div>

          <aside className="proposal-preview" aria-labelledby="preview-title">
            <h2 id="preview-title">Preview da proposta</h2>
            <div className="proposal-preview-total">
              <div><strong>{formattedPrice || 'R$ 0,00'}</strong><span>Valor total · {deadline || 'prazo não informado'}</span></div>
              <span>{guaranteePeriod || 'Sem garantia'}</span>
            </div>
            <div className="proposal-preview-net">
              <span>Você receberá (após taxa 10%)</span>
              <strong>{formatCurrency(String(Math.round(netValue))) || 'R$ 0,00'}</strong>
            </div>
            <div className="proposal-preview-profile">
              <span>Seu perfil:</span>
              <div>
                <span className="proposal-avatar">C</span>
                <div><strong>Carlos Silva</strong><small><ProposalIcon name="star" />4,9 · 48 serviços · Verificado</small></div>
              </div>
            </div>
          </aside>
        </form>
      </main>
    </div>
  )
}

export default ProposalPage
