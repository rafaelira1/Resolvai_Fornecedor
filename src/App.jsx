import { useSyncExternalStore } from 'react'
import './App.css'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import LegalPage from './pages/LegalPage'
import RegisterPage from './pages/RegisterPage'
import ProviderProfilePage from './pages/ProviderProfilePage'
import OpportunitiesPage from './pages/OpportunitiesPage'
import OpportunityDetailsPage from './pages/OpportunityDetailsPage'
import SendProposalPage from './pages/SendProposalPage'
import PasswordRecoveryPage from './pages/PasswordRecoveryPage'
import PasswordResetPage from './pages/PasswordResetPage'
import OrdersPage from './pages/OrdersPage'
import ServiceOrderPage from './pages/ServiceOrderPage'
import ProviderGuard from './components/ProviderGuard'

const publicPaths = new Set(['/', '/login', '/recuperar-senha', '/redefinir-senha', '/cadastro', '/criar-conta', '/termos', '/termos-de-uso', '/privacidade', '/politica-de-privacidade'])

const screens = {
  '/': LoginPage,
  '/login': LoginPage,
  '/home': HomePage,
  '/pedidos': OrdersPage,
  '/pedidos/detalhes': ServiceOrderPage,
  '/recuperar-senha': PasswordRecoveryPage,
  '/redefinir-senha': PasswordResetPage,
  '/cadastro': RegisterPage,
  '/criar-conta': RegisterPage,
  '/perfil': ProviderProfilePage,
  '/meu-perfil': ProviderProfilePage,
  '/oportunidades': OpportunitiesPage,
  '/oportunidades/detalhes': OpportunityDetailsPage,
  '/oportunidades/proposta': SendProposalPage,
  '/termos': () => <LegalPage document="terms" />,
  '/termos-de-uso': () => <LegalPage document="terms" />,
  '/privacidade': () => <LegalPage document="privacy" />,
  '/politica-de-privacidade': () => <LegalPage document="privacy" />,
}

function subscribeToLocation(onChange) {
  window.addEventListener('hashchange', onChange)
  window.addEventListener('popstate', onChange)
  return () => {
    window.removeEventListener('hashchange', onChange)
    window.removeEventListener('popstate', onChange)
  }
}

function getCurrentPath() {
  const path = window.location.pathname.replace(/\/$/, '') || '/'
  if ((path === '/' || path === '/login') && window.location.hash === '#recuperar-senha') {
    return '/recuperar-senha'
  }
  return path
}

function App() {
  const currentPath = useSyncExternalStore(subscribeToLocation, getCurrentPath)
  const Screen = screens[currentPath] ?? LoginPage

  return publicPaths.has(currentPath) || !screens[currentPath] ? <Screen /> : <ProviderGuard><Screen /></ProviderGuard>
}

export default App
