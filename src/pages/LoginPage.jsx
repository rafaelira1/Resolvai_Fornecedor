import LoginForm from '../components/LoginForm'
import ProviderIdentity from '../components/ProviderIdentity'

function LoginPage() {
  return (
    <main className="login-page">
      <section className="brand-panel" aria-label="Apresentação ResolvAI">
        <ProviderIdentity />
        <p className="brand-note">
          Sua próxima oportunidade<br />pode começar por aqui.
        </p>
        <div className="decorative-orbit orbit-one" />
        <div className="decorative-orbit orbit-two" />
      </section>

      <section className="form-panel" aria-labelledby="login-title">
        <ProviderIdentity mobile />
        <LoginForm />
      </section>
    </main>
  )
}

export default LoginPage
