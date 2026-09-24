import { useEffect, useState } from 'react'
import ProviderSidebar from '../components/ProviderSidebar'
import { getServiceCategories } from '../services/serviceCategories'
import './ProviderProfilePage.css'

const INITIAL_PROFILE = {
  name: 'Carlos Silva Impermeabilizações',
  displayName: 'Carlos Silva',
  phone: '(85) 98888-1111',
  email: 'carlos@impermeabiliza.com',
  city: 'Fortaleza, CE',
  radius: '20 km',
  bio: 'Especialista em impermeabilização de lajes, telhados e fachadas há 12 anos. Materiais de primeira qualidade e garantia de até 5 anos.',
  document: '123.456.789-00',
  professionalRegistry: 'CREA-CE 123456/D',
  categoryIds: ['impermeabilizacao', 'alvenaria'],
}

const portfolioItems = [
  { id: 1, title: 'Impermeabilização de laje', type: 'Residencial', tone: 'orange' },
  { id: 2, title: 'Tratamento de fachada', type: 'Comercial', tone: 'violet' },
  { id: 3, title: 'Vedação de cobertura', type: 'Condomínio', tone: 'green' },
]

function Icon({ name }) {
  const paths = {
    edit: <><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" /><path d="m14 7 3 3" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    shield: <><path d="M12 3 5 6v5c0 4.8 2.9 8.1 7 10 4.1-1.9 7-5.2 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    camera: <><path d="M4 7h4l1.5-2h5L16 7h4v12H4z" /><circle cx="12" cy="13" r="3" /></>,
    arrow: <path d="M5 12h14M14 7l5 5-5 5" />,
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function Field({ label, name, value, editing, onChange, type = 'text', wide = false, optional = false, children }) {
  return (
    <label className={`profile-field ${wide ? 'wide' : ''}`}>
      <span>{label}</span>
      {children ?? <input name={name} type={type} value={value} onChange={onChange} readOnly={!editing} required={!optional} />}
    </label>
  )
}

function ProviderProfilePage() {
  const [profile, setProfile] = useState(INITIAL_PROFILE)
  const [draft, setDraft] = useState(INITIAL_PROFILE)
  const [categories, setCategories] = useState([])
  const [portfolio, setPortfolio] = useState(portfolioItems)
  const [isEditing, setIsEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [categoryError, setCategoryError] = useState(false)

  useEffect(() => {
    document.title = 'Meu perfil | ResolvAI Fornecedor'
    getServiceCategories().then(setCategories)
  }, [])

  const categoryNames = profile.categoryIds
    .map((id) => categories.find((category) => category.id === id)?.name)
    .filter(Boolean)

  function startEditing() {
    setDraft({ ...profile, categoryIds: [...profile.categoryIds] })
    setSaved(false)
    setCategoryError(false)
    setIsEditing(true)
  }

  function cancelEditing() {
    setDraft({ ...profile, categoryIds: [...profile.categoryIds] })
    setCategoryError(false)
    setIsEditing(false)
  }

  function updateField(event) {
    const { name, value } = event.target
    setDraft((current) => ({ ...current, [name]: value }))
  }

  function toggleCategory(categoryId) {
    setCategoryError(false)
    setDraft((current) => ({
      ...current,
      categoryIds: current.categoryIds.includes(categoryId)
        ? current.categoryIds.filter((id) => id !== categoryId)
        : [...current.categoryIds, categoryId],
    }))
  }

  function saveProfile(event) {
    event.preventDefault()
    if (!event.currentTarget.reportValidity()) return
    if (draft.categoryIds.length === 0) {
      setCategoryError(true)
      return
    }
    setProfile({ ...draft, categoryIds: [...draft.categoryIds] })
    setIsEditing(false)
    setSaved(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function addPortfolioFiles(event) {
    const additions = Array.from(event.target.files).slice(0, Math.max(0, 6 - portfolio.length))
      .map((file, index) => ({ id: `${file.name}-${index}`, title: file.name, type: 'Nova foto', tone: 'navy' }))
    setPortfolio((current) => [...current, ...additions])
  }

  return (
    <main className="provider-profile-page">
      <ProviderSidebar displayName={profile.displayName} />

      <section className="profile-main">
        <div className="profile-page-heading">
          <div><p>Conta do fornecedor</p><h1>Meu perfil profissional</h1><span>Mantenha suas informações atualizadas para receber oportunidades mais compatíveis.</span></div>
          {!isEditing && <button className="profile-edit-button" type="button" onClick={startEditing}><Icon name="edit" />Editar perfil</button>}
        </div>

        {saved && <div className="profile-saved-message" role="status"><Icon name="check" />Suas alterações foram salvas com sucesso.</div>}

        <section className="profile-identity-card" aria-label="Resumo do perfil">
          <div className="profile-avatar">C</div>
          <div className="profile-identity-copy">
            <h2>{profile.displayName}</h2>
            <p>{categoryNames.join(' · ') || 'Prestador de serviços'}</p>
            <div className="profile-badges"><span className="verified"><Icon name="check" />Verificado</span><span className="top-rated">Top Rated</span><span className="rating">4,9 ★</span></div>
          </div>
          <div className="profile-metrics">
            <div><strong>48</strong><span>serviços</span></div>
            <div><strong>94%</strong><span>conclusão</span></div>
            <div><strong>98%</strong><span>respostas</span></div>
          </div>
        </section>

        <div className={`profile-layout ${isEditing ? 'editing' : ''}`}>
          <form className="profile-form" onSubmit={saveProfile}>
            <section className="profile-card">
              <div className="profile-card-heading"><div><span>Informações profissionais</span><p>Dados exibidos aos clientes nas suas propostas.</p></div>{isEditing && <span className="editing-badge"><Icon name="edit" />Em edição</span>}</div>
              <div className="profile-fields-grid">
                <Field label="Nome ou empresa" name="name" value={draft.name} editing={isEditing} onChange={updateField} wide />
                <Field label="Telefone" name="phone" value={draft.phone} editing={isEditing} onChange={updateField} />
                <Field label="E-mail" name="email" type="email" value={draft.email} editing={isEditing} onChange={updateField} />
                <Field label="Cidade" name="city" value={draft.city} editing={isEditing} onChange={updateField} />
                <Field label="Raio de atendimento" name="radius" value={draft.radius} editing={isEditing} onChange={updateField} />
                <Field label="Especialidades" wide>
                  <div className="profile-category-summary">{(isEditing ? draft.categoryIds : profile.categoryIds).map((id) => <span key={id}>{categories.find((category) => category.id === id)?.name ?? id}</span>)}</div>
                </Field>
                {isEditing && <div className="profile-category-options">{categories.map((category) => <button type="button" className={draft.categoryIds.includes(category.id) ? 'selected' : ''} aria-pressed={draft.categoryIds.includes(category.id)} key={category.id} onClick={() => toggleCategory(category.id)}><span>{draft.categoryIds.includes(category.id) && <Icon name="check" />}</span>{category.name}</button>)}{categoryError && <p className="profile-category-error" role="alert">Selecione pelo menos uma especialidade.</p>}</div>}
                <label className="profile-field wide"><span>Bio profissional</span><textarea name="bio" value={draft.bio} onChange={updateField} readOnly={!isEditing} rows="4" maxLength="360" required /></label>
              </div>
            </section>

            <section className="profile-card">
              <div className="profile-card-heading"><div><span>Portfólio</span><p>Trabalhos que ajudam clientes a conhecer sua experiência.</p></div><span className="portfolio-count">{portfolio.length} trabalhos</span></div>
              <div className="profile-portfolio-grid">
                {portfolio.map((item) => <article className={`portfolio-item ${item.tone}`} key={item.id}><div className="portfolio-art"><Icon name="camera" /></div><strong>{item.title}</strong><span>{item.type}</span>{isEditing && <button type="button" aria-label={`Remover ${item.title}`} onClick={() => setPortfolio((current) => current.filter((entry) => entry.id !== item.id))}><Icon name="close" /></button>}</article>)}
                {isEditing && portfolio.length < 6 && <label className="portfolio-add"><Icon name="camera" /><strong>Adicionar fotos</strong><span>JPG ou PNG</span><input type="file" accept="image/*" multiple onChange={addPortfolioFiles} /></label>}
              </div>
            </section>

            <section className="profile-card">
              <div className="profile-card-heading"><div><span>Documentos</span><p>Informações usadas para a verificação profissional.</p></div><span className="secure-label"><Icon name="shield" />Protegido</span></div>
              <div className="profile-fields-grid">
                <Field label="CPF ou CNPJ" name="document" value={draft.document} editing={isEditing} onChange={updateField} />
                <Field label="Registro profissional (opcional)" name="professionalRegistry" value={draft.professionalRegistry} editing={isEditing} onChange={updateField} optional />
              </div>
            </section>

            {isEditing && <div className="profile-form-actions"><button className="profile-cancel-button" type="button" onClick={cancelEditing}><Icon name="close" />Cancelar</button><button className="profile-save-button" type="submit"><Icon name="check" />Salvar alterações</button></div>}
          </form>

          <aside className="profile-side-column">
            <section className="profile-side-card completion-card"><div className="completion-ring"><strong>92%</strong><span>completo</span></div><div><h3>Perfil quase completo</h3><p>Adicione mais trabalhos ao portfólio para aumentar a confiança dos clientes.</p></div></section>
            <section className="profile-side-card"><div className="side-card-icon"><Icon name="shield" /></div><h3>Conta verificada</h3><p>Sua identidade e documentação foram verificadas.</p><span className="verification-date">Verificado em 24 de maio de 2026</span></section>
            <section className="profile-side-card"><div className="side-card-icon muted"><Icon name="lock" /></div><h3>Segurança da conta</h3><p>Use uma senha forte e mantenha seus dados de acesso protegidos.</p><button type="button">Alterar senha <Icon name="arrow" /></button></section>
          </aside>
        </div>
      </section>

    </main>
  )
}

export default ProviderProfilePage
