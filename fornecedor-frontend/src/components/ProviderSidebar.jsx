import './ProviderSidebar.css'

function ProviderSidebar({ displayName = 'Carlos Silva', isHome = false }) {
  const AccountContainer = isHome ? 'a' : 'div'
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
        <a href="/home" aria-current={isHome ? 'page' : undefined}>Home</a>
      </nav>

      <div className="provider-sidebar-account">
        <AccountContainer
          className="provider-sidebar-account-link"
          href={isHome ? '/meu-perfil' : undefined}
          aria-label={isHome ? `${displayName}, abrir meu perfil` : undefined}
        >
          <span className="provider-sidebar-initials" aria-hidden="true">{initials}</span>
          <span className="provider-sidebar-account-copy">
            <strong>{displayName}</strong>
            <small>Fornecedor verificado</small>
          </span>
        </AccountContainer>
        <a className="provider-sidebar-signout" href="/login">Sair</a>
      </div>
    </aside>
  )
}

export default ProviderSidebar
