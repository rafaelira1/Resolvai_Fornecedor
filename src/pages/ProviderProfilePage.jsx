import { useEffect, useState } from 'react'
import ProviderSidebar from '../components/ProviderSidebar'
import { useProviderSession } from '../hooks/useProviderSession'
import { getServiceCategories } from '../services/serviceCategories'
import { updateProviderProfile, validateProviderProfile } from '../services/fornecedores'
import { BRAZILIAN_STATES, formatDocument } from '../services/registrationValidation'
import './ProviderProfilePage.css'

function editable(profile) {
  return { ...profile, bio: profile.bio ?? '', registroProfissional: profile.registroProfissional ?? '', especialidades: [...profile.especialidades] }
}

function Field({ label, name, value, editing = false, onChange, type = 'text', wide = false, optional = false, ...props }) {
  return <label className={`profile-field ${wide ? 'wide' : ''}`}><span>{label}</span><input name={name} type={type} value={value ?? ''} onChange={onChange} readOnly={!editing} required={!optional} {...props} /></label>
}

function ProviderProfilePage() {
  const session = useProviderSession()
  const profile = session.profile
  const [draft, setDraft] = useState(() => editable(profile))
  const [categories, setCategories] = useState([])
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [categoryLoadError, setCategoryLoadError] = useState('')
  const [categoryReload, setCategoryReload] = useState(0)

  useEffect(() => {
    document.title = 'Meu perfil | ResolvAI Fornecedor'
    const controller = new AbortController()
    getServiceCategories({ signal: controller.signal })
      .then((items) => { if (!controller.signal.aborted) setCategories(items) })
      .catch((failure) => {
        if (!controller.signal.aborted) setCategoryLoadError(failure.message || 'Não foi possível carregar as especialidades.')
      })
      .finally(() => { if (!controller.signal.aborted) setCategoriesLoading(false) })
    return () => controller.abort()
  }, [categoryReload])

  const catalogUnavailable = categoriesLoading || Boolean(categoryLoadError) || categories.length === 0
  const values = isEditing ? draft : editable(profile)
  const categoryNames = profile.especialidades.map((id) => categories.find((category) => category.id === id)?.name).filter(Boolean)
  const initials = profile.nomeExibicao.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()

  function retryCategories() {
    setCategoriesLoading(true)
    setCategoryLoadError('')
    setCategoryReload((value) => value + 1)
  }
  function startEditing() {
    setDraft(editable(profile))
    setSaved(false)
    setError('')
    setIsEditing(true)
  }
  function cancelEditing() {
    setDraft(editable(profile))
    setError('')
    setIsEditing(false)
  }
  function updateField(event) {
    const { name, value } = event.target
    setDraft((current) => ({ ...current, [name]: value }))
  }
  function toggleCategory(id) {
    setDraft((current) => ({ ...current, especialidades: current.especialidades.includes(id) ? current.especialidades.filter((code) => code !== id) : [...current.especialidades, id] }))
  }
  async function saveProfile(event) {
    event.preventDefault()
    if (saving || !event.currentTarget.reportValidity()) return
    if (catalogUnavailable) { setError('Carregue as especialidades antes de salvar.'); return }
    const availableSpecialties = categories.map((category) => category.id)
    const errors = validateProviderProfile(draft, availableSpecialties)
    if (Object.keys(errors).length) { setError(Object.values(errors)[0]); return }
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const confirmed = await updateProviderProfile(draft, { availableSpecialties })
      setDraft(editable(confirmed))
      setIsEditing(false)
      setSaved(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (failure) {
      setError(failure.message || 'Não foi possível salvar as alterações. Tente novamente.')
    } finally { setSaving(false) }
  }

  return (
    <main className="provider-profile-page">
      <ProviderSidebar />
      <section className="profile-main">
        <div className="profile-page-heading">
          <div><p>Conta do fornecedor</p><h1>Meu perfil profissional</h1><span>Mantenha suas informações profissionais atualizadas.</span></div>
          {!isEditing && <button className="profile-edit-button" type="button" onClick={startEditing}>Editar perfil</button>}
        </div>
        {saved && <div className="profile-saved-message" role="status">Suas alterações foram salvas com sucesso.</div>}
        {error && <div className="profile-catalog-error" role="alert">{error}</div>}
        <section className="profile-identity-card" aria-label="Resumo do perfil">
          <div className="profile-avatar" aria-hidden="true">{initials}</div>
          <div className="profile-identity-copy"><h2>{profile.nomeExibicao}</h2><p>{categoryNames.join(' · ') || 'Conta profissional'}</p><p>{profile.cidadeAtuacao}, {profile.ufAtuacao}</p></div>
        </section>
        <div className={`profile-layout profile-layout--account ${isEditing ? 'editing' : ''}`}>
          <form className="profile-form" onSubmit={saveProfile} aria-busy={saving}>
            <fieldset className="profile-editable-fields" disabled={saving}>
              <section className="profile-card">
                <div className="profile-card-heading"><div><span>Informações profissionais</span><p>Dados da sua conta e da sua atuação profissional.</p></div>{isEditing && <span className="editing-badge">Em edição</span>}</div>
                <div className="profile-fields-grid">
                  <Field label="Nome da conta" name="name" value={values.name} editing={isEditing} onChange={updateField} maxLength={200} wide />
                  <Field label="Nome profissional ou empresa" name="nomeExibicao" value={values.nomeExibicao} editing={isEditing} onChange={updateField} maxLength={200} wide />
                  <Field label="Telefone" name="telefone" type="tel" value={values.telefone} editing={isEditing} onChange={updateField} maxLength={20} />
                  <Field label="E-mail" name="email" type="email" value={profile.email} />
                  <Field label="Cidade de atuação" name="cidadeAtuacao" value={values.cidadeAtuacao} editing={isEditing} onChange={updateField} maxLength={120} />
                  {isEditing ? <label className="profile-field"><span>UF de atuação</span><select name="ufAtuacao" value={draft.ufAtuacao} onChange={updateField} required>{BRAZILIAN_STATES.map((uf) => <option key={uf}>{uf}</option>)}</select></label> : <Field label="UF de atuação" name="ufAtuacao" value={profile.ufAtuacao} />}
                  <Field label="Raio de atendimento (km)" name="raioAtendimentoKm" type="number" value={values.raioAtendimentoKm} editing={isEditing} onChange={updateField} min={1} max={200} step={1} />
                  <div className="profile-field wide" role="group" aria-label="Especialidades">
                    <span>Especialidades</span>
                    {categoriesLoading && <p className="profile-catalog-status" role="status">Carregando especialidades…</p>}
                    {!categoriesLoading && catalogUnavailable && <div className="profile-catalog-error" role="alert"><p>{categoryLoadError || 'Nenhuma especialidade está disponível no momento.'}</p><button type="button" onClick={retryCategories}>Tentar novamente</button></div>}
                    <div className="profile-category-summary">{values.especialidades.map((id) => <span key={id}>{categories.find((category) => category.id === id)?.name ?? id}</span>)}</div>
                  </div>
                  {isEditing && <div className="profile-category-options">{categories.map((category) => <button type="button" className={draft.especialidades.includes(category.id) ? 'selected' : ''} aria-pressed={draft.especialidades.includes(category.id)} key={category.id} onClick={() => toggleCategory(category.id)}>{category.name}</button>)}</div>}
                  <label className="profile-field wide"><span>Bio profissional (opcional)</span><textarea name="bio" value={values.bio} onChange={updateField} readOnly={!isEditing} rows="4" maxLength={360} /></label>
                  <Field label="Registro profissional (opcional)" name="registroProfissional" value={values.registroProfissional} editing={isEditing} onChange={updateField} maxLength={80} optional wide />
                </div>
              </section>
              <section className="profile-card">
                <div className="profile-card-heading"><div><span>Dados do cadastro</span><p>Tipo de pessoa, documentos e e-mail são somente leitura.</p></div></div>
                <div className="profile-fields-grid">
                  <Field label="Tipo de pessoa" name="tipoPessoa" value={profile.tipoPessoa === 'PJ' ? 'Pessoa jurídica' : 'Pessoa física'} />
                  <Field label={profile.tipoPessoa === 'PJ' ? 'CNPJ' : 'CPF'} name="document" value={formatDocument(profile.tipoPessoa === 'PJ' ? profile.cnpj : profile.cpf, profile.tipoPessoa)} optional />
                </div>
              </section>
              {isEditing && <div className="profile-form-actions"><button className="profile-cancel-button" type="button" onClick={cancelEditing}>Cancelar</button><button className="profile-save-button" type="submit" disabled={catalogUnavailable || saving}>{saving ? 'Salvando…' : 'Salvar alterações'}</button></div>}
            </fieldset>
          </form>
        </div>
      </section>
    </main>
  )
}

export default ProviderProfilePage
