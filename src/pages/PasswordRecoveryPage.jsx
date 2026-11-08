import { useEffect, useRef, useState } from 'react'
import ProviderIdentity from '../components/ProviderIdentity'
import { requestPasswordRecovery } from '../services/passwordRecovery'
import './PasswordRecoveryPage.css'

function MailIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></svg>
}

function PasswordRecoveryPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const feedbackRef = useRef(null)
  const requestInProgress = useRef(false)
  const sent = status === 'sent'
  const sending = status === 'sending'

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Recuperar senha | ResolvAI Fornecedor'
    return () => { document.title = previousTitle }
  }, [])

  useEffect(() => {
    if (status === 'sent' || status === 'error') feedbackRef.current?.focus()
  }, [status])

  async function handleSubmit(event) {
    event.preventDefault()
    if (requestInProgress.current) return
    requestInProgress.current = true
    setError('')
    setStatus('sending')

    try {
      await requestPasswordRecovery(email.trim())
      setStatus('sent')
    } catch (requestError) {
      setError(requestError.message)
      setStatus('error')
    } finally {
      requestInProgress.current = false
    }
  }

  return (
    <main className="login-page recovery-page">
      <section className="brand-panel" aria-label="Apresentação ResolvAI">
        <ProviderIdentity />
        <p className="brand-note">Vamos ajudar você a voltar<br />às suas próximas oportunidades.</p>
        <div className="decorative-orbit orbit-one" aria-hidden="true" />
        <div className="decorative-orbit orbit-two" aria-hidden="true" />
      </section>

      <section className="form-panel" aria-labelledby="recovery-title">
        <ProviderIdentity mobile />
        <div className="login-card recovery-card">
          <a className="recovery-back" href="/login">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m5-5-5 5 5 5" /></svg>
            Voltar para entrar
          </a>

          <div className={`recovery-icon${sent ? ' recovery-icon-success' : ''}`}>
            {sent ? <MailIcon /> : <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0M12 14v3" /></svg>}
          </div>

          <header className="form-heading">
            <p className="eyebrow">Recuperação de acesso</p>
            <h1 id="recovery-title">{sent ? 'Confira seu e-mail' : 'Esqueceu sua senha?'}</h1>
            <p>{sent ? 'Siga as instruções para criar uma nova senha e voltar à sua conta.' : 'Acontece! Informe o e-mail da sua conta para receber um link de recuperação.'}</p>
          </header>

          {sent ? (
            <div className="recovery-confirmation">
              <div className="recovery-success-message" role="status" tabIndex={-1} ref={feedbackRef}>
                Se houver uma conta associada a <strong>{email.trim()}</strong>, você receberá um link para redefinir sua senha.
              </div>
              <p className="recovery-help">Não encontrou a mensagem? Confira também a pasta de spam ou lixo eletrônico.</p>
              <a className="submit-button recovery-login-button" href="/login">Voltar para entrar</a>
              <button className="recovery-text-button" type="button" onClick={() => setStatus('idle')}>Tentar novamente ou alterar e-mail</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} aria-busy={sending}>
              <div className="field-group">
                <label htmlFor="recovery-email">E-mail cadastrado</label>
                <div className="input-wrapper">
                  <MailIcon />
                  <input id="recovery-email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="seuemail@exemplo.com" required maxLength={254} value={email} readOnly={sending} onChange={(event) => setEmail(event.target.value)} aria-describedby="recovery-email-help" />
                </div>
                <p className="recovery-field-help" id="recovery-email-help">Use o mesmo e-mail informado no cadastro.</p>
              </div>
              {error && <p className="recovery-error" role="alert" tabIndex={-1} ref={feedbackRef}>{error}</p>}
              <button className="submit-button" type="submit" disabled={sending}>
                {sending ? 'Enviando solicitação…' : 'Enviar link de recuperação'}
                {!sending && <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5" /></svg>}
              </button>
              <p className="recovery-help">Você receberá as orientações para escolher uma nova senha pelo e-mail informado.</p>
            </form>
          )}

          <footer className="recovery-footer">Lembrou sua senha? <a href="/login">Entrar na minha conta</a></footer>
        </div>
      </section>
    </main>
  )
}

export default PasswordRecoveryPage
