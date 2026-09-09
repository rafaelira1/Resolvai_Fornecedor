import { useEffect, useRef, useState } from 'react'
import { BrandLockup, BrandWordmark } from '../components/BrandLogo'
import { getServiceCategories } from '../services/serviceCategories'
import './RegisterPage.css'

const steps = [
  { title: 'Dados básicos', description: 'Suas informações de contato' },
  { title: 'Categorias de serviço', description: 'O que você faz e onde atende' },
  { title: 'Documentos e portfólio', description: 'Verificação do seu perfil' },
]

function ArrowIcon({ direction = 'right' }) {
  return (
    <svg className={direction === 'left' ? 'arrow-left' : ''} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M14 7l5 5-5 5" />
    </svg>
  )
}

function CheckIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
}

function UploadIcon({ image = false }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {image ? <><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="m5 18 5-5 3 3 2-2 4 4" /></> : <><path d="M12 16V4m0 0L7 9m5-5 5 5" /><path d="M5 14v5h14v-5" /></>}
    </svg>
  )
}

function CategoryIcon({ name }) {
  const paths = {
    wrench: <><path d="M14.7 6.3a5 5 0 0 0-6.4-6L11 3 8 6 5.3 3.3a5 5 0 0 0 6.4 6L19.4 17a1.7 1.7 0 1 0 2.4-2.4l-7.1-7.1Z" /></>,
    bolt: <path d="m13 2-7 11h6l-1 9 7-12h-6l1-8Z" />,
    drop: <path d="M12 2S5.5 9.1 5.5 14a6.5 6.5 0 0 0 13 0C18.5 9.1 12 2 12 2Z" />,
    paint: <><path d="M4 13a8 8 0 1 1 8 8h-1.5a2 2 0 0 1-1.1-3.7l.5-.3a2 2 0 0 0-1.1-3.7H4Z" /><circle cx="8" cy="9" r="1" /><circle cx="12" cy="6" r="1" /><circle cx="16" cy="9" r="1" /></>,
    bricks: <><path d="M3 5h18v14H3zM3 10h18M3 15h18M8 5v5m8-5v5m-5 0v5m-5 0v4m10-4v4" /></>,
    tools: <><path d="m4 4 6 6m4 4 6 6M14 5l5 5M5 14l5 5" /><path d="m8 12-5 5v4h4l5-5m4-4 5-5V3h-4l-5 5" /></>,
  }

  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function formatPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function formatDocument(value) {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

function RegisterPage() {
  const formRef = useRef(null)
  const [step, setStep] = useState(0)
  const [categories, setCategories] = useState([])
  const [selectedCategories, setSelectedCategories] = useState([])
  const [categoryError, setCategoryError] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', document: '', region: '' })
  const [identityFile, setIdentityFile] = useState(null)
  const [portfolioFiles, setPortfolioFiles] = useState([])

  useEffect(() => {
    document.title = 'Criar conta | ResolvAI Fornecedor'
    getServiceCategories().then(setCategories)
  }, [])

  function updateField(event) {
    const { name, value } = event.target
    const nextValue = name === 'phone' ? formatPhone(value) : name === 'document' ? formatDocument(value) : value
    setFormData((current) => ({ ...current, [name]: nextValue }))
  }

  function toggleCategory(categoryId) {
    setSelectedCategories((current) => current.includes(categoryId)
      ? current.filter((id) => id !== categoryId)
      : [...current, categoryId])
    setCategoryError(false)
  }

  function goToStep(nextStep) {
    setStep(nextStep)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (!formRef.current.reportValidity()) return
    if (step === 1 && selectedCategories.length === 0) {
      setCategoryError(true)
      return
    }

    if (step < steps.length - 1) {
      goToStep(step + 1)
      return
    }

    setCompleted(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (completed) {
    return (
      <main className="register-success">
        <div className="success-card">
          <div className="success-mark"><CheckIcon /></div>
          <p className="register-eyebrow">Cadastro enviado para análise</p>
          <h1>Agora é só aguardar a verificação.</h1>
          <p>Recebemos suas informações e documentos. Você será avisado assim que a análise do seu perfil for concluída.</p>
          <a className="register-primary-button" href="/login">Voltar para entrar <ArrowIcon /></a>
        </div>
      </main>
    )
  }

  return (
    <main className="register-page">
      <aside className="register-aside">
        <a className="register-brand" href="/login" aria-label="ResolvAI — voltar ao login">
          <BrandWordmark />
          <span>Área do fornecedor</span>
        </a>

        <div className="register-aside-copy">
          <p className="register-eyebrow">Comece por aqui</p>
          <h1>Novos serviços estão a poucos passos.</h1>
          <p>Conte um pouco sobre o seu trabalho para encontrarmos oportunidades compatíveis com o seu perfil.</p>
        </div>

        <ol className="desktop-step-list" aria-label="Etapas do cadastro">
          {steps.map((item, index) => {
            const state = index < step ? 'done' : index === step ? 'current' : 'pending'
            return (
              <li className={state} key={item.title} aria-current={index === step ? 'step' : undefined}>
                <span className="step-marker">{index < step ? <CheckIcon /> : index + 1}</span>
                <div><strong>{item.title}</strong><small>{item.description}</small></div>
              </li>
            )
          })}
        </ol>

        <p className="register-aside-note">Você poderá atualizar essas informações depois.</p>
        <div className="register-orbit orbit-a" aria-hidden="true" />
        <div className="register-orbit orbit-b" aria-hidden="true" />
      </aside>

      <section className="register-content">
        <div className="register-shell">
          <header className="register-header">
            <a href="/login"><ArrowIcon direction="left" /> Voltar para entrar</a>
            <span>Cadastro de prestador</span>
          </header>

          <div className="mobile-register-brand">
            <BrandLockup />
          </div>

          <div className="mobile-progress" aria-label={`Etapa ${step + 1} de ${steps.length}`}>
            {steps.map((item, index) => <span className={index <= step ? 'active' : ''} key={item.title} />)}
          </div>

          <div className="register-form-heading">
            <div className="current-step-number">{step + 1}</div>
            <div>
              <p>Etapa {step + 1} de {steps.length}</p>
              <h2>{steps[step].title}</h2>
              <span>{steps[step].description}</span>
            </div>
          </div>

          <form ref={formRef} className="register-form" onSubmit={handleSubmit}>
            {step === 0 && (
              <div className="register-fields-grid">
                <label className="register-field register-field-wide">
                  <span>Nome completo ou empresa</span>
                  <input name="name" value={formData.name} onChange={updateField} placeholder="Como você quer ser encontrado" autoComplete="name" required />
                </label>
                <label className="register-field">
                  <span>Telefone</span>
                  <input name="phone" value={formData.phone} onChange={updateField} placeholder="(85) 99999-0000" inputMode="tel" autoComplete="tel" minLength="14" required />
                </label>
                <label className="register-field">
                  <span>E-mail</span>
                  <input name="email" type="email" value={formData.email} onChange={updateField} placeholder="seu@email.com" autoComplete="email" required />
                </label>
                <label className="register-field register-field-wide">
                  <span>CPF ou CNPJ</span>
                  <input name="document" value={formData.document} onChange={updateField} placeholder="000.000.000-00" inputMode="numeric" minLength="14" required />
                  <small>Usaremos esse dado somente para identificação e verificação.</small>
                </label>
              </div>
            )}

            {step === 1 && (
              <div className="register-categories-step">
                <fieldset className="category-fieldset">
                  <legend>Selecione uma ou mais categorias</legend>
                  <p>Escolha os tipos de serviço que você oferece.</p>
                  <div className="category-grid">
                    {categories.map((category) => {
                      const selected = selectedCategories.includes(category.id)
                      return (
                        <button className={`category-card ${selected ? 'selected' : ''}`} type="button" key={category.id} aria-pressed={selected} onClick={() => toggleCategory(category.id)}>
                          <span className="category-icon"><CategoryIcon name={category.icon} /></span>
                          <span>{category.name}</span>
                          <span className="category-check"><CheckIcon /></span>
                        </button>
                      )
                    })}
                  </div>
                  {categoryError && <span className="register-error" role="alert">Escolha pelo menos uma categoria para continuar.</span>}
                </fieldset>

                <label className="register-field">
                  <span>Região de atuação</span>
                  <input name="region" value={formData.region} onChange={updateField} placeholder="Ex.: Fortaleza, CE — raio de 20 km" required />
                  <small>Informe a cidade e, se quiser, o raio máximo de atendimento.</small>
                </label>
              </div>
            )}

            {step === 2 && (
              <div className="register-documents-step">
                <label className="register-field">
                  <span>Documento de identificação</span>
                  <span className="document-upload">
                    <span className="upload-icon"><UploadIcon /></span>
                    <span className="upload-copy"><strong>{identityFile ? identityFile.name : 'RG ou CNH'}</strong><small>{identityFile ? 'Arquivo selecionado' : 'PDF, JPG ou PNG de até 10 MB'}</small></span>
                    <span className="upload-action">Escolher arquivo</span>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => setIdentityFile(event.target.files[0] ?? null)} required />
                  </span>
                </label>

                <label className="register-field">
                  <span>Fotos de trabalhos anteriores <em>Opcional</em></span>
                  <span className="portfolio-upload">
                    <span className="portfolio-icon"><UploadIcon image /></span>
                    <strong>Adicione fotos do seu portfólio</strong>
                    <small>Você pode selecionar até 5 imagens</small>
                    <span className="portfolio-action">Selecionar fotos</span>
                    <input type="file" accept="image/*" multiple onChange={(event) => setPortfolioFiles(Array.from(event.target.files).slice(0, 5))} />
                  </span>
                </label>

                {portfolioFiles.length > 0 && (
                  <div className="selected-files" aria-live="polite">
                    {portfolioFiles.map((file, index) => <span key={`${file.name}-${index}`}><UploadIcon image /> {file.name}</span>)}
                  </div>
                )}

                <p className="complete-later-note">As fotos são opcionais e podem ser adicionadas depois pelo seu perfil.</p>
              </div>
            )}

            <div className="register-actions">
              <button className="register-secondary-button" type="button" onClick={() => step === 0 ? window.location.assign('/login') : goToStep(step - 1)}>
                <ArrowIcon direction="left" /> Voltar
              </button>
              <button className="register-primary-button" type="submit">
                {step === steps.length - 1 ? 'Concluir cadastro' : 'Continuar'}
                {step === steps.length - 1 ? <CheckIcon /> : <ArrowIcon />}
              </button>
            </div>
          </form>

          <footer className="register-footer">
            Ao criar sua conta, você concorda com os <a href="/termos-de-uso">Termos de Uso</a> e a <a href="/politica-de-privacidade">Política de Privacidade</a>.
          </footer>
        </div>
      </section>
    </main>
  )
}

export default RegisterPage
