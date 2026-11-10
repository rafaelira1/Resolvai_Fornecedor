import { useCallback, useEffect, useRef, useState } from 'react'
import { useProviderData } from '../../hooks/useProviderData'
import { providerCacheKeys } from '../../services/providerCacheData'
import { formatOpportunityDate, getOpportunity, getOpportunityPhotoUrl, getUrgency } from '../../services/opportunities'
import '../../styles/opportunity-details.css'

function DetailIcon({ name }) {
  const paths = {
    arrow: <path d="M19 12H5m6-6-6 6 6 6" />,
    pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    calendar: <><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 3v4m8-4v4M4 11h16" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    chat: <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H7l-4 2 1.5-5A8.5 8.5 0 1 1 21 11.5Z" />,
    pencil: <><path d="m14 5 5 5M4 20l5-1L21 7l-5-5L4 14Z" /><path d="m4 14 5 5" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    image: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1.5" /><path d="m3 17 5-5 4 4 4-6 5 7" /></>,
    zoom: <><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6M10 7v6m-3-3h6" /></>,
    close: <path d="m6 6 12 12M6 18 18 6" />,
  }
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">{paths[name]}</svg>
}

function ProposalButton({ compact = false, id }) {
  return <a className={`request-proposal-button${compact ? ' request-proposal-button-compact' : ''}`} href={`/oportunidades/proposta?id=${encodeURIComponent(id)}`}><DetailIcon name="pencil" />Enviar Proposta</a>
}

function ProblemPhoto({ photo, index, onOpen }) {
  const [failed, setFailed] = useState(false)
  const url = getOpportunityPhotoUrl(photo.url)
  const description = photo.description || `Foto ${index + 1} do problema`
  return <button className={`request-photo${!url || failed ? ' request-photo-unavailable' : ''}`} type="button" onClick={() => onOpen(photo.id)} disabled={!url || failed} aria-label={`Ampliar ${description}`}>
    {url && !failed ? <><img src={url} loading="lazy" referrerPolicy="no-referrer" alt={description} onError={() => setFailed(true)} /><span className="request-photo-zoom"><DetailIcon name="zoom" /></span></>
      : <span className="request-photo-placeholder"><DetailIcon name="image" />Foto indisponível</span>}
  </button>
}

function PhotoPreview({ photo, onClose }) {
  const dialogRef = useRef(null)
  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    return () => dialog.close()
  }, [])
  return <dialog className="request-photo-preview" ref={dialogRef} aria-label="Foto ampliada do problema" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <button className="request-photo-close" type="button" onClick={onClose} aria-label="Fechar foto"><DetailIcon name="close" /></button>
    <img src={getOpportunityPhotoUrl(photo.url)} alt={photo.description || 'Foto do problema'} referrerPolicy="no-referrer" />
    {photo.description && <p>{photo.description}</p>}
  </dialog>
}

function OpportunityDetailsPage() {
  const id = new URLSearchParams(window.location.search).get('id')
  const load = useCallback(options => getOpportunity(id, options), [id])
  const { data: opportunity, loading, error, reload } = useProviderData(load, { cacheKey: providerCacheKeys.opportunity(id) })
  const [photoId, setPhotoId] = useState(null)
  const urgency = getUrgency(opportunity?.urgency)
  const client = opportunity?.client
  const initials = client?.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'C'
  const services = opportunity?.specifications?.split(/\r?\n/).map(line => line.replace(/^\s*[-*•]\s*/, '').trim()).filter(Boolean) ?? []
  const previewPhoto = opportunity?.photos.find(photo => photo.id === photoId)

  useEffect(() => {
    document.title = `${opportunity?.title || 'Detalhe do pedido'} | ResolvAI Fornecedor`
  }, [opportunity?.title])

  return (
    <section className="request-detail-page" aria-busy={loading}>
      <div className="request-detail-container">
        <header className="request-detail-heading">
          <div><h1>Detalhe do Pedido</h1><p>Leia o escopo completo antes de enviar sua proposta.</p></div>
          <div className="request-heading-actions">
            <a className="request-back-button" href="/oportunidades"><DetailIcon name="arrow" />Voltar ao Feed</a>
            {opportunity && <ProposalButton compact id={opportunity.id} />}
          </div>
        </header>
        {loading && <section className="request-card request-feedback" role="status"><span className="request-loading-indicator" aria-hidden="true" />Carregando pedido…</section>}
        {error && <section className="request-card request-feedback" role="alert"><p>{error.status === 404 ? 'Este pedido não está mais disponível ou não corresponde às suas especialidades.' : error.message}</p><button className="request-back-button" type="button" onClick={reload}>Tentar novamente</button></section>}
        {opportunity && <div className="request-detail-layout">
          <div className="request-main-column">
            <section className="request-card request-scope-card" aria-labelledby="order-title">
              <div className="request-title-row"><h2 id="order-title">{opportunity.title}</h2><span className={`request-urgency request-urgency-${urgency.tone}`}>{urgency.label}</span></div>
              <div className="request-meta">
                <span><DetailIcon name="pin" />{opportunity.location || 'Localização não informada'}</span>
                <span><DetailIcon name="calendar" />Publicado em {formatOpportunityDate(opportunity.createdAt)}</span>
                <span><DetailIcon name="chat" />{opportunity.proposalsCount} {opportunity.proposalsCount === 1 ? 'proposta enviada' : 'propostas enviadas'}</span>
              </div>
              <section className="request-scope" aria-labelledby="request-scope-title">
                <h3 id="request-scope-title">Escopo do Pedido</h3>
                <dl className="request-scope-grid">
                  <div><dt>Tipo de serviço</dt><dd>{opportunity.category}</dd></div>
                  <div><dt>Localização</dt><dd>{opportunity.location || 'Não informada'}</dd></div>
                  <div><dt>Prioridade do cliente</dt><dd>{urgency.label}</dd></div>
                  <div><dt>Situação do pedido</dt><dd className="request-open-status"><span />Aberto para propostas</dd></div>
                </dl>
              </section>
              <section className="request-description"><h3>Descrição do Problema</h3><p>{opportunity.description || 'Descrição não informada.'}</p></section>
              {opportunity.details && <section className="request-description"><h3>Detalhes adicionais</h3><p>{opportunity.details}</p></section>}
              <section className="request-services" aria-labelledby="request-services-title">
                <h3 id="request-services-title">Serviços Necessários</h3>
                {services.length > 0 ? <ul>{services.map((service, index) => <li key={`${index}-${service}`}><span><DetailIcon name="check" /></span>{service}</li>)}</ul>
                  : <p className="request-empty-copy">O cliente não informou uma lista de serviços. Consulte a descrição do pedido.</p>}
              </section>
            </section>
            <section className="request-card request-photos-card" aria-labelledby="problem-photos-title">
              <header><h2 id="problem-photos-title">Fotos do Problema <span>({opportunity.photos.length})</span></h2></header>
              {opportunity.photos.length === 0 ? <div className="request-photos-empty"><DetailIcon name="image" /><p>O cliente não anexou fotos a este pedido.</p></div> : <div className="request-photo-grid">
                {opportunity.photos.map((photo, index) => <ProblemPhoto photo={photo} index={index} key={photo.id} onOpen={setPhotoId} />)}
              </div>}
            </section>
          </div>
          <aside className="request-side-column">
            <section className="request-card request-client-card" aria-labelledby="request-client-title">
              <h2 id="request-client-title">Informações do Cliente</h2>
              <div className="request-client-identity"><span className="request-client-avatar" aria-hidden="true">{initials}</span><div><strong>{client?.name || 'Cliente'}</strong><span>Cliente ResolvAI</span></div></div>
              <dl className="request-client-facts">
                <div><dt>Histórico</dt><dd>{client ? `${client.completedOrdersCount} ${client.completedOrdersCount === 1 ? 'serviço concluído' : 'serviços concluídos'}` : 'Não informado'}</dd></div>
                <div><dt>Pedidos publicados</dt><dd>{client?.ordersCount ?? 'Não informado'}</dd></div>
                <div><dt>Conta desde</dt><dd>{client ? new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(new Date(client.memberSince)) : 'Não informada'}</dd></div>
              </dl>
            </section>
            <div className="request-action-panel">
              <ProposalButton id={opportunity.id} />
            </div>
          </aside>
        </div>}
      </div>
      {previewPhoto && getOpportunityPhotoUrl(previewPhoto.url) && <PhotoPreview photo={previewPhoto} onClose={() => setPhotoId(null)} />}
    </section>
  )
}

export default OpportunityDetailsPage
