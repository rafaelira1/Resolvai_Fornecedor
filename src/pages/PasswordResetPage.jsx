import { useEffect, useRef, useState } from 'react'
import ProviderIdentity from '../components/ProviderIdentity'
import { EyeIcon } from '../components/Icons'
import { passwordRecovery, RECOVERY_LINK_ERROR } from '../services/passwordRecovery'
import './PasswordRecoveryPage.css'

function LockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></svg>
}

function PasswordResetPage() {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [visible, setVisible] = useState(false)
  const [status, setStatus] = useState(() => passwordRecovery.hasValidSession() ? 'idle' : 'invalid')
  const [error, setError] = useState('')
  const feedbackRef = useRef(null)
  const inProgress = useRef(false)
  const saving = status === 'saving'
  const success = status === 'success'
  const invalid = status === 'invalid'

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Redefinir senha | ResolvAI Fornecedor'
    return () => { document.title = previousTitle }
  }, [])

  useEffect(() => {
    if (['success', 'error', 'invalid'].includes(status)) feedbackRef.current?.focus()
  }, [status])

  async function handleSubmit(event) {
    event.preventDefault()
    if (inProgress.current) return
    inProgress.current = true
    setError('')
    setStatus('saving')
    try {
      await passwordRecovery.resetPassword(password, confirmation)
      setPassword('')
      setConfirmation('')
      setStatus('success')
    } catch (requestError) {
      setError(requestError.message)
      setStatus(passwordRecovery.hasValidSession() ? 'error' : 'invalid')
    } finally {
      inProgress.current = false
    }
  }

  return (
    <main className="login-page recovery-page">
      <section className="brand-panel" aria-label="Apresentação ResolvAI">
        <ProviderIdentity />
        <p className="brand-note">Recupere seu acesso e volte<br />às suas próximas oportunidades.</p>
        <div className="decorative-orbit orbit-one" aria-hidden="true" />
        <div className="decorative-orbit orbit-two" aria-hidden="true" />
      </section>
      <section className="form-panel" aria-labelledby="reset-title">
        <ProviderIdentity mobile />
        <div className="login-card recovery-card">
          <a className="recovery-back" href="/login">Voltar para entrar</a>
          <div className={`recovery-icon${success ? ' recovery-icon-success' : ''}`}><LockIcon /></div>
          <header className="form-heading">
            <p className="eyebrow">Recuperação de acesso</p>
            <h1 id="reset-title">{success ? 'Senha alterada!' : invalid ? 'Solicite um novo link' : 'Crie sua nova senha'}</h1>
            <p>{success ? 'Agora você pode entrar na sua conta com a nova senha.' : invalid ? 'O link precisa estar válido para recuperar sua conta.' : 'Escolha uma senha segura e confirme abaixo.'}</p>
          </header>
          {success ? (
            <div>
              <p className="recovery-success-message" role="status" tabIndex={-1} ref={feedbackRef}>Sua senha foi redefinida com sucesso.</p>
              <a className="submit-button recovery-login-button" href="/login">Entrar com a nova senha</a>
            </div>
          ) : invalid ? (
            <div>
              <p className="recovery-error" role="alert" tabIndex={-1} ref={feedbackRef}>{RECOVERY_LINK_ERROR}</p>
              <a className="submit-button recovery-login-button" href="/recuperar-senha">Solicitar novo link</a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} aria-busy={saving}>
              <div className="field-group">
                <label htmlFor="new-password">Nova senha</label>
                <div className="input-wrapper">
                  <LockIcon />
                  <input id="new-password" name="newPassword" type={visible ? 'text' : 'password'} autoComplete="new-password" required minLength={8} maxLength={128} value={password} readOnly={saving} onChange={event => setPassword(event.target.value)} aria-describedby="reset-help" />
                  <button className="password-toggle" type="button" onClick={() => setVisible(value => !value)} aria-label={visible ? 'Ocultar senhas' : 'Mostrar senhas'} aria-pressed={visible}><EyeIcon hidden={visible} /></button>
                </div>
              </div>
              <div className="field-group">
                <label htmlFor="confirm-password">Confirmar nova senha</label>
                <div className="input-wrapper">
                  <LockIcon />
                  <input id="confirm-password" name="passwordConfirmation" type={visible ? 'text' : 'password'} autoComplete="new-password" required minLength={8} maxLength={128} value={confirmation} readOnly={saving} onChange={event => setConfirmation(event.target.value)} />
                </div>
                <p className="recovery-field-help" id="reset-help">Use entre 8 e 128 caracteres. Combine letras, números e símbolos.</p>
              </div>
              {error && <p className="recovery-error" role="alert" tabIndex={-1} ref={feedbackRef}>{error}</p>}
              <button className="submit-button" type="submit" disabled={saving}>{saving ? 'Salvando nova senha…' : 'Salvar nova senha'}</button>
            </form>
          )}
        </div>
      </section>
    </main>
  )
}

export default PasswordResetPage
