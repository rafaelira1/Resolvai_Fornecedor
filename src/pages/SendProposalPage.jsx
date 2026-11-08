import { useEffect, useRef, useState } from 'react'
import { useProviderSession } from '../hooks/useProviderSession'
import { getOpportunity } from '../services/opportunities'
import { sendProposal } from '../services/proposals'
import './SendProposalPage.css'

const currency = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100)
const maxPhotos = 5
const maxPhotoBytes = 5 * 1024 * 1024

function FormIcon({ name }) {
  const paths = {
    arrow: <path d="M19 12H5m6-6-6 6 6 6" />,
    camera: <><path d="M3 7h5l2-3h4l2 3h5v14H3Z" /><circle cx="12" cy="13" r="4" /></>,
    send: <><path d="m3 3 18 9-18 9 4-9Z" /><path d="M7 12h14" /></>,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    document: <><path d="M14 3H5v18h14V8Zm0 0v5h5M8 12h8m-8 4h5" /></>,
  }
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">{paths[name]}</svg>
}

function SendProposalPage() {
  const session = useProviderSession()
  const id = new URLSearchParams(window.location.search).get('id')
  const [state, setState] = useState(null)
  const [reload, setReload] = useState(0)
  const [priceDigits, setPriceDigits] = useState('')
  const [deadline, setDeadline] = useState('3 dias')
  const [startDate, setStartDate] = useState('')
  const [description, setDescription] = useState('')
  const [materials, setMaterials] = useState('')
  const [guaranteePeriod, setGuaranteePeriod] = useState('90 dias')
  const [guaranteeType, setGuaranteeType] = useState('Reexecução gratuita')
  const [guaranteeConditions, setGuaranteeConditions] = useState('')
  const [portfolio, setPortfolio] = useState([])
  const [portfolioError, setPortfolioError] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(null)
  const [submissionError, setSubmissionError] = useState('')
  const [uncertain, setUncertain] = useState(false)
  const sendingRef = useRef(false)
  const requestId = useRef(null)
  const photoUrls = useRef(new Set())
  const requestKey = JSON.stringify([session?.sessionId, session?.profile?.especialidades, id, reload])
  const current = state?.key === requestKey ? state : null
  const opportunity = current?.data
  const profileName = session?.profile?.nomeExibicao || session?.user.name || 'Minha conta'
  const initials = profileName.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
  const amount = Number(priceDigits || 0)
  const today = new Date()
  const minimumDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  useEffect(() => {
    const controller = new AbortController()
    getOpportunity(id, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setState({ key: requestKey, data }) })
      .catch(error => { if (!controller.signal.aborted) setState({ key: requestKey, error: error.status === 404 ? 'Este pedido não está disponível para receber sua proposta.' : error.message }) })
    return () => controller.abort()
  }, [id, requestKey])

  useEffect(() => {
    document.title = `Enviar Proposta${opportunity ? ` | ${opportunity.title}` : ''} | ResolvAI`
  }, [opportunity])

  useEffect(() => {
    const urls = photoUrls.current
    return () => { urls.forEach(url => URL.revokeObjectURL(url)); urls.clear() }
  }, [])

  function addPhotos(files) {
    if (sendingRef.current || sent || uncertain) return
    setPortfolioError('')
    const selected = Array.from(files)
    if (selected.length + portfolio.length > maxPhotos) { setPortfolioError('Adicione no máximo 5 fotos. Remova uma imagem para escolher outra.'); return }
    if (selected.some(file => !['image/jpeg', 'image/png'].includes(file.type))) { setPortfolioError('Escolha apenas imagens JPG ou PNG.'); return }
    if (selected.some(file => file.size <= 0 || file.size > maxPhotoBytes)) { setPortfolioError('Cada imagem deve ter até 5 MB e não pode estar vazia.'); return }
    const additions = selected.map(file => {
      const url = URL.createObjectURL(file)
      photoUrls.current.add(url)
      return { id: url, name: file.name, url, file }
    })
    setPortfolio(previous => [...previous, ...additions])
  }

  function selectPhotos(event) { addPhotos(event.target.files); event.target.value = '' }
  function removePhoto(photo) {
    if (sendingRef.current || sent || uncertain) return
    URL.revokeObjectURL(photo.url)
    photoUrls.current.delete(photo.url)
    setPortfolio(previous => previous.filter(item => item.id !== photo.id))
    setPortfolioError('')
  }

  async function submitProposal(event) {
    event.preventDefault()
    if (sendingRef.current || sent) return
    if (!event.currentTarget.reportValidity()) return
    sendingRef.current = true
    setSending(true)
    setSubmissionError('')
    requestId.current ??= globalThis.crypto.randomUUID()
    try {
      const result = await sendProposal(id, {
        requestId: requestId.current, valueCents: amount, deadline, startDate, description, materials,
        guaranteePeriod, guaranteeType, guaranteeConditions,
      }, portfolio.map(photo => photo.file))
      setSent(result)
      setUncertain(false)
    } catch (error) {
      setSubmissionError(error.message)
      setUncertain(error.uncertain === true)
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }

  return <main className="send-proposal-page">
    <div className="send-proposal-container">
      <header className="send-proposal-heading">
        <div><h1>Enviar Proposta</h1><p>Preencha todos os campos. Garantia é obrigatória.</p></div>
        <a className="send-proposal-back" href={id ? `/oportunidades/detalhes?id=${encodeURIComponent(id)}` : '/oportunidades'}><FormIcon name="arrow" />Voltar ao Pedido</a>
      </header>
      {!current && <section className="send-proposal-card send-proposal-feedback" role="status">Carregando os dados do pedido…</section>}
      {current?.error && <section className="send-proposal-card send-proposal-feedback" role="alert"><p>{current.error}</p><button type="button" className="send-proposal-back" onClick={() => setReload(value => value + 1)}>Tentar novamente</button></section>}
      {opportunity && <form className="send-proposal-layout" onSubmit={submitProposal} aria-busy={sending}>
        <div className="send-proposal-form-column">
          <div className="send-proposal-order" aria-label="Pedido selecionado"><FormIcon name="document" /><div><strong>{opportunity.title}</strong><span>{opportunity.category}{opportunity.location ? ` · ${opportunity.location}` : ''}</span></div></div>
          {sent && <div className="send-proposal-success" role="status"><strong>Proposta enviada com sucesso!</strong><span>Os dados e as fotos foram salvos. Sua proposta está disponível para o cliente.</span></div>}
          {submissionError && <p className="send-proposal-submit-error" role="alert">{submissionError}</p>}
          <fieldset className="send-proposal-form-fields" disabled={sending || !!sent || uncertain}>
          <section className="send-proposal-card" aria-labelledby="proposal-values-title">
            <h2 id="proposal-values-title">Valores e Prazo</h2>
            <div className="send-proposal-fields">
              <label className="send-proposal-field"><span>Valor total <b>*</b></span><input name="value" type="text" inputMode="numeric" value={priceDigits ? currency(amount) : ''} onChange={event => setPriceDigits(event.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 11))} placeholder="R$ 0,00" required /></label>
              <label className="send-proposal-field"><span>Prazo de execução <b>*</b></span><select name="deadline" value={deadline} onChange={event => setDeadline(event.target.value)} required><option value="">Selecione o prazo</option>{['1 dia', '2 dias', '3 dias', '5 dias', '7 dias', '10 dias', '15 dias', '20 dias', '30 dias', '45 dias', '60 dias'].map(value => <option key={value}>{value}</option>)}</select></label>
              <label className="send-proposal-field full"><span>Data de início disponível</span><input name="startDate" type="date" min={minimumDate} value={startDate} onChange={event => setStartDate(event.target.value)} /></label>
            </div>
          </section>
          <section className="send-proposal-card" aria-labelledby="proposal-description-title">
            <h2 id="proposal-description-title">Descrição da Proposta</h2>
            <label className="send-proposal-field"><span>O que você vai fazer <b>*</b></span><textarea name="description" rows={4} value={description} minLength={20} maxLength={2000} onChange={event => setDescription(event.target.value)} placeholder="Descreva as etapas do serviço, o que será realizado e o resultado esperado." required /></label>
            <label className="send-proposal-field"><span>Materiais incluídos</span><textarea name="materials" rows={3} value={materials} maxLength={1000} onChange={event => setMaterials(event.target.value)} placeholder="Informe os materiais incluídos no valor e quais ficarão por conta do cliente." /></label>
          </section>
          <section className="send-proposal-card" aria-labelledby="proposal-warranty-title">
            <h2 id="proposal-warranty-title">Garantia <b>*</b></h2>
            <div className="send-proposal-fields">
              <label className="send-proposal-field"><span>Prazo de garantia</span><select name="guaranteePeriod" value={guaranteePeriod} onChange={event => setGuaranteePeriod(event.target.value)} required><option value="">Selecione o prazo</option>{['30 dias', '60 dias', '90 dias', '180 dias', '1 ano'].map(value => <option key={value}>{value}</option>)}</select></label>
              <label className="send-proposal-field"><span>Tipo de garantia</span><select name="guaranteeType" value={guaranteeType} onChange={event => setGuaranteeType(event.target.value)} required><option value="">Selecione o tipo</option>{['Reexecução gratuita', 'Reparo sem custo', 'Manutenção sem custo', 'Reembolso do valor'].map(value => <option key={value}>{value}</option>)}</select></label>
              <label className="send-proposal-field full"><span>Condições da garantia</span><textarea name="guaranteeConditions" rows={3} value={guaranteeConditions} maxLength={1000} onChange={event => setGuaranteeConditions(event.target.value)} placeholder="Explique o que a garantia cobre, suas condições e eventuais exclusões." /></label>
            </div>
          </section>
          <section className="send-proposal-card" aria-labelledby="proposal-portfolio-title">
            <h2 id="proposal-portfolio-title">Portfólio <span>(Trabalhos Similares)</span></h2>
            <label className="send-proposal-upload" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); addPhotos(event.dataTransfer.files) }}>
              <FormIcon name="camera" /><strong>Clique para adicionar fotos de serviços similares</strong><span>Até 5 fotos · JPG ou PNG · Até 5 MB por foto</span>
              <input name="portfolio" aria-label="Adicionar fotos de serviços similares" type="file" accept="image/jpeg,image/png" multiple onChange={selectPhotos} disabled={portfolio.length >= maxPhotos} />
            </label>
            {portfolioError && <p className="send-proposal-photo-error" role="alert">{portfolioError}</p>}
            <div className="send-proposal-photos">
              {portfolio.map(photo => <figure key={photo.id}><img src={photo.url} alt={photo.name} /><figcaption>{photo.name}</figcaption><button type="button" onClick={() => removePhoto(photo)} aria-label={`Remover ${photo.name}`}><FormIcon name="close" /></button></figure>)}
              {portfolio.length < maxPhotos && <label className="send-proposal-add-photo"><span aria-hidden="true">+</span><span>Adicionar foto</span><input aria-label="Adicionar outra foto" type="file" accept="image/jpeg,image/png" multiple onChange={selectPhotos} /></label>}
            </div>
          </section>
          </fieldset>
          {sent ? <a className="send-proposal-back" href={`/oportunidades/detalhes?id=${encodeURIComponent(id)}`}>Voltar ao Pedido</a>
            : <button className="send-proposal-submit" type="submit" disabled={sending}><FormIcon name="send" />{sending ? 'Enviando proposta…' : uncertain ? 'Verificar envio' : 'Enviar Proposta'}</button>}
          {uncertain && <p className="send-proposal-unavailable">Mantenha os mesmos dados e use “Verificar envio” para confirmar a proposta sem duplicá-la.</p>}
        </div>
        <aside className="send-proposal-preview" aria-labelledby="proposal-preview-title">
          <h2 id="proposal-preview-title"><FormIcon name="document" />Prévia da Proposta</h2>
          <div className="send-proposal-preview-price"><div><strong>{currency(amount)}</strong><span>Valor total · {deadline || 'Prazo não informado'}</span></div><span className="send-proposal-warranty-badge">{guaranteePeriod ? `${guaranteePeriod} de garantia` : 'Garantia não informada'}</span></div>
          <div className="send-proposal-preview-net"><span>Valor líquido estimado (simulação com taxa de 10%)</span><strong>{currency(Math.round(amount * 0.9))}</strong></div>
          <div className="send-proposal-profile"><span>Seu perfil</span><div><span className="send-proposal-avatar" aria-hidden="true">{initials}</span><div><strong>{profileName}</strong><small>{session?.profile?.cidadeAtuacao ? `${session.profile.cidadeAtuacao} · ${session.profile.ufAtuacao}` : 'Conta profissional'}</small></div></div></div>
          <p className="send-proposal-preview-note">A taxa de 10% é ilustrativa e não é descontada do valor salvo da proposta.</p>
        </aside>
      </form>}
    </div>
  </main>
}

export default SendProposalPage
