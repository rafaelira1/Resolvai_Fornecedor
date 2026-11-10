import { useEffect, useState } from 'react'
import { EyeIcon } from './Icons'
import { authSession } from '../services/session'
import { getProviderProfile } from '../services/fornecedores'
import { createLoginFlow } from '../services/loginFlow'

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [flow] = useState(() => createLoginFlow({
    auth: authSession,
    loadProfile: getProviderProfile,
    onState: (state) => { setLoading(state.loading); setError(state.error) },
    onSuccess: (destination) => window.location.assign(destination),
  }))
  useEffect(() => () => flow.cancel(), [flow])

  function handleSubmit(event) {
    event.preventDefault()
    if (loading) return
    const data = new FormData(event.currentTarget)
    void flow.submit({ email: data.get('email'), password: data.get('password'), remember: data.has('remember') })
  }

  return (
    <div className="login-card">
      <header className="form-heading">
        <p className="eyebrow">Bem-vindo de volta</p>
        <h1 id="login-title">Acesse sua conta</h1>
        <p>Use sua conta do Cliente ou do Fornecedor para entrar.</p>
      </header>

      <form onSubmit={handleSubmit} aria-busy={loading}>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <div className="field-group">
          <label htmlFor="email">E-mail</label>
          <div className="input-wrapper">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="3" />
              <path d="m4 7 8 6 8-6" />
            </svg>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="seuemail@exemplo.com"
              required
            />
          </div>
        </div>

        <div className="field-group">
          <div className="label-row">
            <label htmlFor="password">Senha</label>
            <a href="#recuperar-senha">Esqueci minha senha</a>
          </div>
          <div className="input-wrapper">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="4" y="10" width="16" height="11" rx="3" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Digite sua senha"
              minLength="6"
              required
            />
            <button
              className="password-toggle"
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              aria-pressed={showPassword}
            >
              <EyeIcon hidden={showPassword} />
            </button>
          </div>
        </div>

        <label className="remember-option">
          <input type="checkbox" name="remember" />
          <span>Lembrar meu acesso</span>
        </label>

        <button className="submit-button" type="submit" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14M14 7l5 5-5 5" />
          </svg>
        </button>

      </form>

      <div className="signup-callout">
        <span>Ainda não possui uma conta?</span>
        <a href="/criar-conta">Criar conta</a>
      </div>

      <footer>
        Ao continuar, você concorda com os <a href="/termos-de-uso">Termos de Uso</a> e a{' '}
        <a href="/politica-de-privacidade">Política de Privacidade</a>.
      </footer>
    </div>
  )
}

export default LoginForm
