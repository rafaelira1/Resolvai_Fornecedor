import { useSyncExternalStore } from 'react'
import './App.css'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import LegalPage from './pages/LegalPage'
import RegisterPage from './pages/RegisterPage'
import ProviderProfilePage from './pages/ProviderProfilePage'
import OpportunitiesPage from './pages/OpportunitiesPage'
import OrderDetailsPage from './pages/OrderDetailsPage'
import ProposalPage from './pages/ProposalPage'
import PasswordRecoveryPage from './pages/PasswordRecoveryPage'
import OrdersPage from './pages/OrdersPage'
import ServiceOrderPage from './pages/ServiceOrderPage'

const screens = {
  '/': LoginPage,
  '/login': LoginPage,
  '/home': HomePage,
  '/pedidos': OrdersPage,
  '/pedidos/detalhes': ServiceOrderPage,
  '/recuperar-senha': PasswordRecoveryPage,
  '/cadastro': RegisterPage,
  '/criar-conta': RegisterPage,
  '/perfil': ProviderProfilePage,
  '/meu-perfil': ProviderProfilePage,
  '/oportunidades': OpportunitiesPage,
  '/oportunidades/detalhes': OrderDetailsPage,
  '/oportunidades/proposta': ProposalPage,
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

  return <Screen />
}

export default App
