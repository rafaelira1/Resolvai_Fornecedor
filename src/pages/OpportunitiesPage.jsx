import { useEffect, useMemo, useState } from 'react'
import ProviderSidebar from '../components/ProviderSidebar'
import { opportunities } from '../data/opportunities'
import './OpportunitiesPage.css'

const categories = ['Todos', 'Hidráulica', 'Impermeabilização', 'Alvenaria', 'Pintura', 'Alta Compat.']

function Compatibility({ value }) {
  const tone = value >= 80 ? 'high' : value >= 65 ? 'medium' : 'low'

  return (
    <div className={`opportunities-compatibility ${tone}`} aria-label={`${value}% de compatibilidade`}>
      <span aria-hidden="true"><span style={{ width: `${value}%` }} /></span>
      <strong>{value}%</strong>
    </div>
  )
}

function OpportunitiesPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todos')
  const [sortBy, setSortBy] = useState('compatibility')

  useEffect(() => {
    document.title = 'Oportunidades | ResolvAI Fornecedor'
  }, [])

  const filteredOpportunities = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR')
    const result = opportunities.filter((opportunity) => {
      const matchesQuery = !normalizedQuery || [opportunity.title, opportunity.category, opportunity.location]
        .some((value) => value.toLocaleLowerCase('pt-BR').includes(normalizedQuery))
      const matchesCategory = category === 'Todos'
        || (category === 'Alta Compat.' ? opportunity.compatibility >= 80 : opportunity.category === category)
      return matchesQuery && matchesCategory
    })

    return [...result].sort((a, b) => {
      if (sortBy === 'recent') return a.id - b.id
      if (sortBy === 'proposals') return a.proposals - b.proposals
      return b.compatibility - a.compatibility
    })
  }, [category, query, sortBy])

  return (
    <div className="opportunities-page">
      <ProviderSidebar activePage="opportunities" />

      <main className="opportunities-content">
        <header className="opportunities-heading">
          <h1>Feed de Pedidos</h1>
          <p>Pedidos compatíveis com suas categorias e região de atuação.</p>
        </header>

        <section className="opportunities-stats" aria-label="Resumo das oportunidades">
          <article className="opportunities-stat available">
            <strong>24</strong>
            <span>Pedidos disponíveis</span>
            <small>Na sua região hoje</small>
          </article>
          <article className="opportunities-stat matches">
            <strong>8</strong>
            <span>Alta compatibilidade</span>
            <small>Acima de 80% de match</small>
          </article>
          <article className="opportunities-stat volume">
            <strong>R$ 89.400</strong>
            <span>Volume total disponível</span>
            <small>Potencial de receita</small>
          </article>
        </section>

        <section className="opportunities-board" aria-label="Lista de oportunidades">
          <div className="opportunities-toolbar">
            <label className="opportunities-search">
              <span className="sr-only">Buscar pedidos</span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m16 16 4 4" /></svg>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar pedidos..." />
            </label>

            <div className="opportunities-filters" aria-label="Filtrar por categoria">
              {categories.map((item) => (
                <button key={item} className={category === item ? 'active' : ''} type="button" onClick={() => setCategory(item)} aria-pressed={category === item}>
                  {item}
                </button>
              ))}
            </div>

            <label className="opportunities-sort">
              <span className="sr-only">Ordenar pedidos</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option value="compatibility">Ordenar: Compatibilidade</option>
                <option value="recent">Ordenar: Mais recentes</option>
                <option value="proposals">Ordenar: Menos propostas</option>
              </select>
            </label>
          </div>

          <div className="opportunities-table-scroll">
            <div className="opportunities-table" role="table" aria-label="Todos os pedidos">
              <div className="opportunities-row opportunities-table-head" role="row">
                <span role="columnheader">Pedido</span>
                <span role="columnheader">Categoria</span>
                <span role="columnheader">Localização</span>
                <span role="columnheader">Valor est.</span>
                <span role="columnheader">Propostas</span>
                <span role="columnheader">Compatibilidade IA</span>
                <span role="columnheader">Urgência</span>
                <span role="columnheader">Ação</span>
              </div>

              {filteredOpportunities.map((opportunity) => (
                <div className="opportunities-row" role="row" key={opportunity.id}>
                  <div className="opportunities-request" role="cell">
                    <strong>{opportunity.title}</strong>
                    <small>{opportunity.postedAt} · Prazo do cliente: {opportunity.deadline}</small>
                  </div>
                  <div role="cell"><span className={`opportunities-category category-${opportunity.category.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`}>{opportunity.category}</span></div>
                  <span role="cell">{opportunity.location}</span>
                  <strong className="opportunities-value" role="cell">{opportunity.estimate}</strong>
                  <div role="cell"><span className={`opportunities-proposals ${opportunity.proposals === 0 ? 'empty' : ''}`}>{opportunity.proposals} {opportunity.proposals === 1 ? 'enviada' : 'enviadas'}</span></div>
                  <Compatibility value={opportunity.compatibility} />
                  <div role="cell"><span className={`opportunities-urgency urgency-${opportunity.urgency.toLocaleLowerCase('pt-BR')}`}>{opportunity.urgency}</span></div>
                  <div role="cell"><a className={`opportunities-view-button ${opportunity.compatibility >= 80 ? 'primary' : ''}`} href={`/oportunidades/detalhes?id=${opportunity.id}`}>Ver Pedido</a></div>
                </div>
              ))}
            </div>
          </div>

          {filteredOpportunities.length === 0 && (
            <div className="opportunities-empty" role="status">
              <strong>Nenhum pedido encontrado</strong>
              <span>Tente buscar outro termo ou alterar os filtros.</span>
            </div>
          )}

          {filteredOpportunities.length > 0 && (
            <footer className="opportunities-footer">
              Exibindo {filteredOpportunities.length} de 24 oportunidades disponíveis
            </footer>
          )}
        </section>
      </main>
    </div>
  )
}

export default OpportunitiesPage
