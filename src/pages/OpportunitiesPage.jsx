import { useEffect, useState } from 'react'
import ProviderSidebar from '../components/ProviderSidebar'
import { useProviderSession } from '../hooks/useProviderSession'
import { formatOpportunityDate, getOpportunities, getUrgency } from '../services/opportunities'
import './OpportunitiesPage.css'

function OpportunitiesPage() {
  const session = useProviderSession()
  const sessionId = session?.sessionId
  const specialtiesKey = session?.profile?.especialidades.join(',') ?? ''
  const [filters, setFilters] = useState({ search: '', category: '', sort: 'recent', page: 1 })
  const [search, setSearch] = useState('')
  const [reload, setReload] = useState(0)
  const [state, setState] = useState(null)
  const requestKey = JSON.stringify([sessionId, specialtiesKey, filters, reload])
  const current = state?.key === requestKey ? state : null
  const loading = !current
  const data = current?.data
  const error = current?.error
  const specialties = data?.specialties ?? state?.data?.specialties ?? []
  const total = data?.totalItems ?? 0

  useEffect(() => {
    document.title = 'Oportunidades | ResolvAI Fornecedor'
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    getOpportunities({ ...filters, signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setState({ key: requestKey, data: result }) })
      .catch(requestError => { if (!controller.signal.aborted) setState({ key: requestKey, error: requestError.message }) })
    return () => controller.abort()
  }, [filters, requestKey])

  function updateFilter(field, value) {
    setFilters(previous => ({ ...previous, [field]: value, page: 1 }))
  }

  function submitSearch(event) {
    event.preventDefault()
    updateFilter('search', search.trim())
  }

  return (
    <div className="opportunities-page">
      <ProviderSidebar activePage="opportunities" />

      <main className="opportunities-content">
        <header className="opportunities-heading">
          <h1>Feed de Pedidos</h1>
          <p>Pedidos abertos compatíveis com as especialidades do seu perfil profissional.</p>
        </header>

        <section className="opportunities-stats" aria-label="Resumo das oportunidades">
          <article className="opportunities-stat available">
            <strong>{data ? total : '—'}</strong>
            <span>Pedidos encontrados</span>
            <small>Compatíveis com seu perfil{filters.search || filters.category ? ' e os filtros' : ''}</small>
          </article>
          <article className="opportunities-stat matches">
            <strong>{data ? specialties.length : '—'}</strong>
            <span>Suas especialidades ativas</span>
            <small><a href="/meu-perfil">Gerenciar especialidades</a></small>
          </article>
        </section>

        <section className="opportunities-board" aria-label="Lista de oportunidades" aria-busy={loading}>
          <div className="opportunities-toolbar">
            <form className="opportunities-search-form" onSubmit={submitSearch} role="search">
            <label className="opportunities-search">
              <span className="sr-only">Buscar pedidos</span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m16 16 4 4" /></svg>
              <input type="search" value={search} maxLength={200} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar pedidos..." />
            </label>
            <button className="opportunities-control" type="submit">Buscar</button>
            </form>

            <div className="opportunities-filters" aria-label="Filtrar por categoria">
              {[{ codigo: '', nome: 'Todos' }, ...specialties].map((item) => (
                <button key={item.codigo} className={filters.category === item.codigo ? 'active' : ''} type="button" onClick={() => updateFilter('category', item.codigo)} aria-pressed={filters.category === item.codigo}>
                  {item.nome}
                </button>
              ))}
            </div>

            <label className="opportunities-sort">
              <span className="sr-only">Ordenar pedidos</span>
              <select value={filters.sort} onChange={(event) => updateFilter('sort', event.target.value)}>
                <option value="recent">Ordenar: Mais recentes</option>
                <option value="proposals">Ordenar: Menos propostas</option>
              </select>
            </label>
            <button className="opportunities-control" type="button" disabled={loading} onClick={() => setReload(value => value + 1)}>Atualizar</button>
          </div>

          {loading && <div className="opportunities-empty" role="status">Carregando oportunidades…</div>}
          {error && <div className="opportunities-empty opportunities-error" role="alert"><strong>{error}</strong><button className="opportunities-control" type="button" onClick={() => setReload(value => value + 1)}>Tentar novamente</button></div>}
          {data && data.items.length > 0 && <div className="opportunities-table-scroll">
            <div className="opportunities-table" role="table" aria-label="Todos os pedidos">
              <div className="opportunities-row opportunities-table-head" role="row">
                <span role="columnheader">Pedido</span>
                <span role="columnheader">Categoria</span>
                <span role="columnheader">Localização</span>
                <span role="columnheader">Propostas</span>
                <span role="columnheader">Urgência</span>
                <span role="columnheader">Ação</span>
              </div>

              {data.items.map((opportunity) => (
                <div className="opportunities-row" role="row" key={opportunity.id}>
                  <div className="opportunities-request" role="cell">
                    <strong>{opportunity.title}</strong>
                    <small>Publicado em {formatOpportunityDate(opportunity.createdAt)}</small>
                  </div>
                  <div role="cell"><span className={`opportunities-category category-${opportunity.category.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`}>{opportunity.category}</span></div>
                  <span role="cell">{opportunity.location || 'Não informada'}</span>
                  <div role="cell"><span className={`opportunities-proposals ${opportunity.proposalsCount === 0 ? 'empty' : ''}`}>{opportunity.proposalsCount} {opportunity.proposalsCount === 1 ? 'enviada' : 'enviadas'}</span></div>
                  <div role="cell"><span className={`opportunities-urgency urgency-${getUrgency(opportunity.urgency).tone}`}>{getUrgency(opportunity.urgency).label}</span></div>
                  <div role="cell"><a className="opportunities-view-button primary" href={`/oportunidades/detalhes?id=${opportunity.id}`}>Ver Pedido</a></div>
                </div>
              ))}
            </div>
          </div>}

          {data && data.items.length === 0 && (
            <div className="opportunities-empty" role="status">
              <strong>Nenhuma oportunidade encontrada</strong>
              <span>{specialties.length === 0 ? 'Adicione especialidades ativas ao seu perfil para receber oportunidades.' : filters.search || filters.category ? 'Tente buscar outro termo ou alterar os filtros.' : 'Ainda não há pedidos abertos nas suas especialidades. Atualize para consultar novamente.'}</span>
              {filters.page > 1 && <button className="opportunities-control" type="button" onClick={() => updateFilter('page', 1)}>Voltar à primeira página</button>}
            </div>
          )}

          {data && total > 0 && (
            <footer className="opportunities-footer">
              <span>Exibindo {data.items.length} de {total} oportunidades</span>
              <nav className="opportunities-pagination" aria-label="Páginas de oportunidades">
                <button className="opportunities-control" type="button" disabled={filters.page <= 1} onClick={() => setFilters(previous => ({ ...previous, page: previous.page - 1 }))}>Anterior</button>
                <span>Página {data.page} de {data.totalPages}</span>
                <button className="opportunities-control" type="button" disabled={filters.page >= data.totalPages} onClick={() => setFilters(previous => ({ ...previous, page: previous.page + 1 }))}>Próxima</button>
              </nav>
            </footer>
          )}
        </section>
      </main>
    </div>
  )
}

export default OpportunitiesPage
