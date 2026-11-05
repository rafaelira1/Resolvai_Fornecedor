import './ProviderSidebar.css'
import { useProviderSession } from '../hooks/useProviderSession'
import { authSession } from '../services/session'

function ProviderSidebar({ activePage = 'profile', isHome = false }) {
  const session = useProviderSession()
  const displayName = session?.profile?.nomeExibicao || session?.user.name || 'Minha conta'
  const currentPage = isHome ? 'home' : activePage
  const isProfile = currentPage === 'profile'
  const AccountContainer = isProfile ? 'div' : 'a'
  const initials = displayName.trim().split(/\s+/).slice(0, 2)
    .map((part) => part[0]).join('').toUpperCase() || 'F'

  return (
    <aside className="provider-sidebar">
      <a className="provider-sidebar-brand" href="/home" aria-label="ResolvAI, página inicial">
        <span className="provider-sidebar-mark" aria-hidden="true">R</span>
        <span className="provider-sidebar-brand-copy">
          <strong>ResolvAI</strong>
          <small>Fornecedor</small>
        </span>
      </a>

      <nav className="provider-sidebar-navigation" aria-label="Menu principal">
        <span>Menu</span>
        <a href="/home" aria-current={currentPage === 'home' ? 'page' : undefined}>Home</a>
        <a href="/oportunidades" aria-current={currentPage === 'opportunities' ? 'page' : undefined}>Oportunidades</a>
        <a href="/pedidos" aria-current={currentPage === 'orders' ? 'page' : undefined}>Meus Pedidos</a>
      </nav>

      <div className="provider-sidebar-account">
        <AccountContainer
          className="provider-sidebar-account-link"
          href={!isProfile ? '/meu-perfil' : undefined}
          aria-label={!isProfile ? `${displayName}, abrir meu perfil` : undefined}
        >
          <span className="provider-sidebar-initials" aria-hidden="true">{initials}</span>
          <span className="provider-sidebar-account-copy">
            <strong>{displayName}</strong>
            <small>Conta profissional</small>
          </span>
        </AccountContainer>
        <a className="provider-sidebar-signout" href="/login" onClick={() => authSession.logout()}>Sair</a>
      </div>
    </aside>
  )
}

export default ProviderSidebar
