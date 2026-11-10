import { useEffect, useRef, useState } from 'react'
import ProviderSidebar from '../dashboard/Sidebar'
import { useProviderSession } from '../../hooks/useProviderSession'
import '../../styles/layout.css'

const pages = {
  '/home': { title: 'Visão geral', activePage: 'home' },
  '/oportunidades': { title: 'Oportunidades', activePage: 'opportunities' },
  '/oportunidades/detalhes': { title: 'Detalhe do pedido', activePage: 'opportunities', parent: 'Oportunidades', parentHref: '/oportunidades' },
  '/oportunidades/proposta': { title: 'Enviar proposta', activePage: 'opportunities', parent: 'Oportunidades', parentHref: '/oportunidades' },
  '/pedidos': { title: 'Meus Pedidos', activePage: 'orders' },
  '/pedidos/detalhes': { title: 'Detalhes do pedido', activePage: 'orders', parent: 'Meus Pedidos', parentHref: '/pedidos' },
  '/perfil': { title: 'Perfil profissional', activePage: 'profile' },
  '/meu-perfil': { title: 'Perfil profissional', activePage: 'profile' },
}

export default function ProviderLayout({ children, currentPath = '/home' }) {
  const session = useProviderSession()
  const page = pages[currentPath.split('?')[0].replace(/\/$/, '')] ?? pages['/home']
  const [mobileOpen, setMobileOpen] = useState(false)
  const sidebarRef = useRef(null)
  const contentRef = useRef(null)
  const displayName = session?.profile?.nomeExibicao || session?.user.name || 'Minha conta'
  const initials = displayName.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'F'
  useEffect(() => {
    const close = () => setMobileOpen(false)
    window.addEventListener('popstate', close)
    window.addEventListener('hashchange', close)
    return () => { window.removeEventListener('popstate', close); window.removeEventListener('hashchange', close) }
  }, [])
  useEffect(() => {
    const closeOnDesktop = () => { if (window.innerWidth > 760) setMobileOpen(false) }
    window.addEventListener('resize', closeOnDesktop)
    return () => window.removeEventListener('resize', closeOnDesktop)
  }, [])
  useEffect(() => {
    if (!mobileOpen) return
    const previousFocus = document.activeElement
    const previousOverflow = document.body?.style.overflow
    if (document.body) document.body.style.overflow = 'hidden'
    const elements = sidebarRef.current?.querySelectorAll('a[href], button:not([disabled])')
    const first = elements?.[0]
    const last = elements?.[elements.length - 1]
    first?.focus()
    const handleKey = event => {
      if (event.key === 'Escape') setMobileOpen(false)
      if (event.key === 'Tab') {
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      if (document.body) document.body.style.overflow = previousOverflow
      previousFocus?.focus?.()
    }
  }, [mobileOpen])
  return (
    <div className="provider-app-shell">
      <a className="provider-skip-link" href="#provider-main" onClick={event => {
        event.preventDefault()
        contentRef.current?.focus()
        contentRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
      }}>Pular para o conteúdo</a>
      {mobileOpen && <button type="button" className="provider-sidebar-overlay" aria-label="Fechar menu de navegação" onClick={() => setMobileOpen(false)} />}
      <ProviderSidebar activePage={page.activePage} mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} onClose={() => setMobileOpen(false)} sidebarRef={sidebarRef} />
      <div className="provider-main-shell">
        <header className="provider-topbar">
          <div className="provider-topbar-location">
            <button className="provider-mobile-menu" type="button" aria-label="Abrir menu de navegação" aria-controls="provider-navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(value => !value)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg></button>
            <nav className="provider-breadcrumb" aria-label="Localização"><span>Fornecedor</span><span aria-hidden="true">/</span>{page.parent && <><a href={page.parentHref}>{page.parent}</a><span aria-hidden="true">/</span></>}<strong aria-current="page">{page.title}</strong></nav>
          </div>
          <a className="provider-topbar-account" href="/meu-perfil" aria-label={`Abrir perfil de ${displayName}`}><span>{displayName}</span><span className="provider-topbar-avatar" aria-hidden="true">{initials}</span></a>
        </header>
        <main ref={contentRef} id="provider-main" className="provider-main-content" tabIndex="-1">{children}</main>
      </div>
    </div>
  )
}
