import { BrandLockup } from '../BrandLogo'
import OrderIcon from '../OrderIcon'
import { useProviderSession } from '../../hooks/useProviderSession'
import { authSession } from '../../services/session'
import '../../styles/sidebar.css'

const navigation = [
  { id: 'home', href: '/home', label: 'Visão geral', icon: 'home' },
  { id: 'opportunities', href: '/oportunidades', label: 'Oportunidades', icon: 'document' },
  { id: 'orders', href: '/pedidos', label: 'Meus Pedidos', icon: 'tool' },
]

export default function ProviderSidebar({ activePage = 'home', isHome = false, mobileOpen = false, onNavigate, onClose, sidebarRef }) {
  const session = useProviderSession()
  const displayName = session?.profile?.nomeExibicao || session?.user.name || 'Minha conta'
  const currentPage = isHome ? 'home' : activePage
  const initials = displayName.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'F'
  return (
    <aside ref={sidebarRef} id="provider-navigation" className={`provider-sidebar${mobileOpen ? ' is-open' : ''}`} aria-label="Menu do fornecedor" role={mobileOpen ? 'dialog' : undefined} aria-modal={mobileOpen || undefined}>
      <div className="provider-sidebar-content">
        <div className="provider-sidebar-brand-row">
          <a className="provider-sidebar-brand" href="/home" aria-label="ResolvAI, início do fornecedor" onClick={onNavigate}><BrandLockup tone="light" className="provider-sidebar-logo" /></a>
          <button className="provider-sidebar-close" type="button" onClick={onClose} aria-label="Fechar menu"><OrderIcon name="close" /></button>
        </div>
        <nav className="provider-sidebar-navigation" aria-label="Menu principal">
          <p>Principal</p>
          {navigation.map(item => <a key={item.id} href={item.href} aria-current={currentPage === item.id ? 'page' : undefined} onClick={onNavigate}><OrderIcon name={item.icon} /><span>{item.label}</span></a>)}
        </nav>
        <a className="provider-sidebar-signout" href="/login" onClick={() => { authSession.logout(); onNavigate?.() }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5H4v14h5m5-12 5 5-5 5m-5-5h10" /></svg><span>Sair da conta</span></a>
      </div>
      <a className="provider-sidebar-account" href="/meu-perfil" onClick={onNavigate} aria-current={currentPage === 'profile' ? 'page' : undefined} aria-label={`${displayName}, abrir meu perfil`}>
        <span className="provider-sidebar-initials" aria-hidden="true">{initials}</span>
        <span className="provider-sidebar-account-copy"><strong>{displayName}</strong><small>Fornecedor</small></span><OrderIcon name="next" />
      </a>
    </aside>
  )
}
