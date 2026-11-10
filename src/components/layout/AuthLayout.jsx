import { BrandLockup } from '../BrandLogo'
import '../../styles/login.css'

/** Shared public-page composition, following the customer portal's centered card. */
export default function AuthLayout({ children, titleId, wide = false, className = '' }) {
  return (
    <main className={`auth-layout login-container${wide ? ' auth-layout-wide' : ''}${className ? ` ${className}` : ''}`}>
      <section className="auth-card" aria-labelledby={titleId}>
        <header className="auth-brand">
          <a href="/login" aria-label="ResolvAI — página de acesso"><BrandLockup /></a>
          <span>Área do fornecedor</span>
        </header>
        {children}
      </section>
    </main>
  )
}
