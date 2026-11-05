import { useEffect, useRef, useState } from 'react'
import { BrandLockup, BrandWordmark } from '../components/BrandLogo'
import { getServiceCategories } from '../services/serviceCategories'
import { registerProvider } from '../services/providerRegistration'
import {
  BASIC_FIELDS,
  BRAZILIAN_STATES,
  createRegistrationPayload,
  formatDocument,
  formatPhone,
  validateRegistration,
} from '../services/registrationValidation'
import './RegisterPage.css'

const steps = [
  { title: 'Dados básicos e acesso', description: 'Sua identificação e sua conta' },
  { title: 'Perfil profissional', description: 'O que você faz e onde atende' },
  { title: 'Revisão do cadastro', description: 'Confira os dados antes de concluir' },
]

const initialForm = {
  name: '', email: '', password: '', passwordConfirmation: '', tipoPessoa: 'PF',
  nomeExibicao: '', cpf: '', cnpj: '', telefone: '', cidadeAtuacao: '', ufAtuacao: '',
  raioAtendimentoKm: '20', bio: '', registroProfissional: '', especialidades: [],
}

function ArrowIcon({ direction = 'right' }) {
  return <svg className={direction === 'left' ? 'arrow-left' : ''} viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5" /></svg>
}

function CheckIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
}

function CategoryIcon({ name }) {
  const paths = {
    wrench: <path d="M14.7 6.3a5 5 0 0 0-6.4-6L11 3 8 6 5.3 3.3a5 5 0 0 0 6.4 6L19.4 17a1.7 1.7 0 1 0 2.4-2.4l-7.1-7.1Z" />,
    bolt: <path d="m13 2-7 11h6l-1 9 7-12h-6l1-8Z" />,
    drop: <path d="M12 2S5.5 9.1 5.5 14a6.5 6.5 0 0 0 13 0C18.5 9.1 12 2 12 2Z" />,
    paint: <><path d="M4 13a8 8 0 1 1 8 8h-1.5a2 2 0 0 1-1.1-3.7l.5-.3a2 2 0 0 0-1.1-3.7H4Z" /><circle cx="8" cy="9" r="1" /><circle cx="12" cy="6" r="1" /><circle cx="16" cy="9" r="1" /></>,
    bricks: <path d="M3 5h18v14H3zM3 10h18M3 15h18M8 5v5m8-5v5m-5 0v5m-5 0v4m10-4v4" />,
    tools: <><path d="m4 4 6 6m4 4 6 6M14 5l5 5M5 14l5 5" /><path d="m8 12-5 5v4h4l5-5m4-4 5-5V3h-4l-5 5" /></>,
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name] ?? paths.tools}</svg>
}

function RegistrationField({ label, name, value, onChange, error, hint, wide = false, optional = false, multiline = false, children, ...props }) {
  const id = `register-${name}`
  const controlProps = {
    id, name, value, onChange,
    'aria-invalid': Boolean(error),
    'aria-describedby': error || hint ? `${id}-message` : undefined,
    ...props,
  }
  return (
    <label className={`register-field${wide ? ' register-field-wide' : ''}`} htmlFor={id}>
      <span>{label}{optional && <em> Opcional</em>}</span>
      {children ? <select {...controlProps}>{children}</select> : multiline ? <textarea {...controlProps} /> : <input {...controlProps} />}
      {(error || hint) && <small id={`${id}-message`} className={error ? 'register-error' : undefined}>{error || hint}</small>}
    </label>
  )
}

function ReviewRow({ label, value }) {
  return <div className="register-review-row"><dt>{label}</dt><dd>{value || 'Não informado'}</dd></div>
}

function RegisterPage() {
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [categories, setCategories] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState('')
  const [catalogRetry, setCatalogRetry] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState('')
  const [completed, setCompleted] = useState(false)
  const submittingRef = useRef(false)
  const focusTarget = useRef(null)
  const mountedRef = useRef(false)

  useEffect(() => {
    document.title = 'Criar conta | ResolvAI Fornecedor'
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    getServiceCategories({ signal: controller.signal })
      .then((items) => {
        if (controller.signal.aborted) return
        setCategories(items)
        setCatalogError('')
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setCategories([])
        setCatalogError(error.message || 'Não foi possível carregar as especialidades.')
      })
      .finally(() => { if (!controller.signal.aborted) setCatalogLoading(false) })
    return () => controller.abort()
  }, [catalogRetry])

  useEffect(() => {
    if (!focusTarget.current) return
    document.getElementById(focusTarget.current)?.focus()
    focusTarget.current = null
  }, [step, errors])

  function updateField(event) {
    const { name, value } = event.target
    const nextValue = name === 'telefone' ? formatPhone(value)
      : name === 'cpf' || name === 'cnpj' ? formatDocument(value, formData.tipoPessoa) : value
    setFormData((current) => name === 'tipoPessoa'
      ? { ...current, tipoPessoa: value, cpf: '', cnpj: '' }
      : { ...current, [name]: nextValue })
    setErrors((current) => {
      const next = { ...current }
      delete next[name]
      if (name === 'tipoPessoa') { delete next.cpf; delete next.cnpj }
      if (name === 'password') delete next.passwordConfirmation
      return next
    })
  }

  function toggleCategory(categoryId) {
    const available = new Set(categories.map((category) => category.id))
    setFormData((current) => {
      const selected = current.especialidades.filter((id) => available.has(id))
      return { ...current, especialidades: selected.includes(categoryId)
        ? selected.filter((id) => id !== categoryId) : [...selected, categoryId] }
    })
    setErrors((current) => ({ ...current, especialidades: undefined }))
  }

  function goToStep(nextStep) {
    setStep(nextStep)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function retryCategories() {
    setCatalogLoading(true)
    setCatalogError('')
    setCatalogRetry((current) => current + 1)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (submittingRef.current) return
    const nextErrors = validateRegistration(formData, {
      step: step < 2 ? step : undefined,
      availableSpecialties: categories.map((category) => category.id),
    })
    if (step > 0 && (catalogLoading || catalogError || categories.length === 0)) {
      nextErrors.especialidades = 'Carregue as especialidades disponíveis antes de continuar.'
    }
    const firstError = Object.keys(nextErrors).find((field) => nextErrors[field])
    setErrors(nextErrors)
    if (firstError) {
      focusTarget.current = `register-${firstError}`
      goToStep(BASIC_FIELDS.includes(firstError) ? 0 : 1)
      return
    }
    if (step < 2) {
      focusTarget.current = 'register-step-title'
      goToStep(step + 1)
      return
    }

    submittingRef.current = true
    setSubmitting(true)
    setSubmissionError('')
    try {
      await registerProvider(createRegistrationPayload(formData))
      if (!mountedRef.current) return
      setFormData((current) => ({ ...current, password: '', passwordConfirmation: '' }))
      setCompleted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      if (mountedRef.current) setSubmissionError(error.message || 'Não foi possível confirmar a conclusão do cadastro. Tente novamente com os mesmos dados.')
    } finally {
      submittingRef.current = false
      if (mountedRef.current) setSubmitting(false)
    }
  }

  if (completed) {
    return (
      <main className="register-success">
        <div className="success-card" role="status">
          <div className="success-mark"><CheckIcon /></div>
          <p className="register-eyebrow">Cadastro realizado</p>
          <h1>Seu perfil profissional foi criado.</h1>
          <p>Seus dados foram cadastrados com sucesso. Volte para a tela de entrada para acessar sua conta.</p>
          <a className="register-primary-button" href="/login">Voltar para entrar <ArrowIcon /></a>
        </div>
      </main>
    )
  }

  const fieldProps = (name) => ({ name, value: formData[name], onChange: updateField, error: errors[name] })
  const catalogUnavailable = catalogLoading || Boolean(catalogError) || categories.length === 0

  return (
    <main className="register-page">
      <aside className="register-aside">
        <a className="register-brand" href="/login" aria-label="ResolvAI — voltar ao login"><BrandWordmark /><span>Área do fornecedor</span></a>
        <div className="register-aside-copy">
          <p className="register-eyebrow">Comece por aqui</p>
          <h1>Novos serviços estão a poucos passos.</h1>
          <p>Conte um pouco sobre o seu trabalho para encontrarmos oportunidades compatíveis com o seu perfil.</p>
        </div>
        <ol className="desktop-step-list" aria-label="Etapas do cadastro">
          {steps.map((item, index) => {
            const state = index < step ? 'done' : index === step ? 'current' : 'pending'
            return <li className={state} key={item.title} aria-current={index === step ? 'step' : undefined}><span className="step-marker">{index < step ? <CheckIcon /> : index + 1}</span><div><strong>{item.title}</strong><small>{item.description}</small></div></li>
          })}
        </ol>
        <p className="register-aside-note">Revise seus dados antes de concluir o cadastro.</p>
        <div className="register-orbit orbit-a" aria-hidden="true" /><div className="register-orbit orbit-b" aria-hidden="true" />
      </aside>

      <section className="register-content">
        <div className="register-shell">
          <header className="register-header"><a href="/login"><ArrowIcon direction="left" /> Voltar para entrar</a><span>Cadastro de prestador</span></header>
          <div className="mobile-register-brand"><BrandLockup /></div>
          <div className="mobile-progress" aria-label={`Etapa ${step + 1} de ${steps.length}`}>{steps.map((item, index) => <span className={index <= step ? 'active' : ''} key={item.title} />)}</div>
          <div className="register-form-heading"><div className="current-step-number">{step + 1}</div><div><p>Etapa {step + 1} de {steps.length}</p><h2 id="register-step-title" tabIndex="-1">{steps[step].title}</h2><span>{steps[step].description}</span></div></div>

          <form className="register-form" onSubmit={handleSubmit} noValidate aria-busy={submitting}>
            {Object.values(errors).some(Boolean) && <div className="register-message register-message-error" role="alert">Confira os campos indicados para continuar.</div>}
            {submissionError && <div className="register-message register-message-error" role="alert">{submissionError}</div>}
            <fieldset className="register-inputs" disabled={submitting}>
              <legend className="register-visually-hidden">{steps[step].title}</legend>
              {step === 0 && <div className="register-fields-grid">
                <RegistrationField label="Tipo de cadastro" {...fieldProps('tipoPessoa')} wide required><option value="PF">Pessoa física (PF)</option><option value="PJ">Pessoa jurídica (PJ)</option></RegistrationField>
                <RegistrationField label={formData.tipoPessoa === 'PJ' ? 'Nome da conta ou empresa' : 'Nome completo'} {...fieldProps('name')} autoComplete="name" maxLength={200} required wide />
                <RegistrationField label="Telefone com DDD" {...fieldProps('telefone')} type="tel" autoComplete="tel-national" placeholder="DDD e número" maxLength={20} required />
                <RegistrationField label="E-mail" {...fieldProps('email')} type="email" autoComplete="email" maxLength={320} hint="Use um e-mail distinto da sua conta Cliente." required />
                {formData.tipoPessoa === 'PF'
                  ? <RegistrationField label="CPF" {...fieldProps('cpf')} inputMode="numeric" autoComplete="off" maxLength={14} required wide />
                  : <RegistrationField label="CNPJ" {...fieldProps('cnpj')} autoCapitalize="characters" autoComplete="off" maxLength={18} hint="Aceita CNPJ numérico ou alfanumérico." required wide />}
                <RegistrationField label="Senha" {...fieldProps('password')} type="password" autoComplete="new-password" minLength={8} maxLength={128} hint="De 8 a 128 caracteres." required />
                <RegistrationField label="Confirme a senha" {...fieldProps('passwordConfirmation')} type="password" autoComplete="new-password" maxLength={128} required />
              </div>}

              {step === 1 && <div className="register-categories-step">
                <div className="register-fields-grid">
                  <RegistrationField label="Nome profissional ou comercial" {...fieldProps('nomeExibicao')} maxLength={200} hint="Nome que será exibido aos clientes." required wide />
                  <RegistrationField label="Cidade de atuação" {...fieldProps('cidadeAtuacao')} autoComplete="address-level2" maxLength={120} required />
                  <RegistrationField label="UF" {...fieldProps('ufAtuacao')} autoComplete="address-level1" required><option value="">Selecione</option>{BRAZILIAN_STATES.map((uf) => <option key={uf} value={uf}>{uf}</option>)}</RegistrationField>
                  <RegistrationField label="Raio de atendimento (km)" {...fieldProps('raioAtendimentoKm')} type="number" min={1} max={200} step={1} hint="Padrão: 20 km. Máximo: 200 km." optional />
                  <RegistrationField label="Registro profissional" {...fieldProps('registroProfissional')} maxLength={80} optional />
                  <RegistrationField label="Bio profissional" {...fieldProps('bio')} multiline rows={4} maxLength={360} hint="Conte um pouco sobre seu trabalho. Até 360 caracteres." optional wide />
                </div>
                <fieldset className="category-fieldset" id="register-especialidades" tabIndex="-1" aria-describedby={errors.especialidades ? 'register-especialidades-message' : undefined} aria-invalid={Boolean(errors.especialidades)}>
                  <legend>Selecione uma ou mais especialidades</legend><p>Escolha os tipos de serviço que você oferece.</p>
                  {catalogLoading && <p className="register-catalog-status" role="status">Carregando especialidades…</p>}
                  {!catalogLoading && catalogUnavailable && <div className="register-message register-message-error" role="alert"><p>{catalogError || 'Nenhuma especialidade está disponível no momento.'}</p><button type="button" onClick={retryCategories}>Tentar novamente</button></div>}
                  {!catalogUnavailable && <div className="category-grid">{categories.map((category) => {
                    const selected = formData.especialidades.includes(category.id)
                    return <button className={`category-card ${selected ? 'selected' : ''}`} type="button" key={category.id} aria-pressed={selected} onClick={() => toggleCategory(category.id)}><span className="category-icon"><CategoryIcon name={category.icon} /></span><span>{category.name}</span><span className="category-check"><CheckIcon /></span></button>
                  })}</div>}
                  {errors.especialidades && <span className="register-error" id="register-especialidades-message">{errors.especialidades}</span>}
                </fieldset>
              </div>}

              {step === 2 && <div className="register-review-step">
                <p className="register-review-intro">Confira suas informações. Para corrigir algum campo, volte à etapa correspondente.</p>
                <section className="register-review-section" aria-label="Dados da conta"><h3>Dados da conta</h3><dl className="register-review-grid"><ReviewRow label="Tipo de cadastro" value={formData.tipoPessoa === 'PF' ? 'Pessoa física' : 'Pessoa jurídica'} /><ReviewRow label="Nome da conta" value={formData.name.trim()} /><ReviewRow label="E-mail" value={formData.email.trim()} /><ReviewRow label="Telefone" value={formData.telefone} /><ReviewRow label={formData.tipoPessoa === 'PF' ? 'CPF' : 'CNPJ'} value={formData.tipoPessoa === 'PF' ? formData.cpf : formData.cnpj} /></dl></section>
                <section className="register-review-section" aria-label="Perfil profissional"><h3>Perfil profissional</h3><dl className="register-review-grid"><ReviewRow label="Nome de exibição" value={formData.nomeExibicao.trim()} /><ReviewRow label="Atendimento" value={`${formData.cidadeAtuacao.trim()}, ${formData.ufAtuacao}`} /><ReviewRow label="Raio" value={`${formData.raioAtendimentoKm === '' ? 20 : formData.raioAtendimentoKm} km`} /><ReviewRow label="Registro profissional" value={formData.registroProfissional.trim()} /><ReviewRow label="Bio" value={formData.bio.trim()} /></dl><div className="register-review-specialties">{formData.especialidades.map((id) => <span key={id}>{categories.find((category) => category.id === id)?.name ?? id}</span>)}</div></section>
              </div>}
            </fieldset>
            <div className="register-actions">
              <button className="register-secondary-button" type="button" disabled={submitting} onClick={() => step === 0 ? window.location.assign('/login') : goToStep(step - 1)}><ArrowIcon direction="left" /> Voltar</button>
              <button className="register-primary-button" type="submit" disabled={submitting || (step > 0 && catalogUnavailable)}>{submitting ? 'Enviando…' : step === 2 ? 'Concluir cadastro' : 'Continuar'}{step === 2 ? <CheckIcon /> : <ArrowIcon />}</button>
            </div>
          </form>
          <footer className="register-footer">Ao criar sua conta, você concorda com os <a href="/termos-de-uso">Termos de Uso</a> e a <a href="/politica-de-privacidade">Política de Privacidade</a>.</footer>
        </div>
      </section>
    </main>
  )
}

export default RegisterPage
