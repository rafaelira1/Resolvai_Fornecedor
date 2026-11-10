import { useEffect, useSyncExternalStore } from 'react'
import HomePage from '../pages/Dashboard'
import LoginPage from '../pages/Login'
import LegalPage from '../pages/Legal'
import RegisterPage from '../pages/Cadastro'
import ProviderProfilePage from '../pages/ProviderProfile'
import OpportunitiesPage from '../pages/Opportunities'
import OpportunityDetailsPage from '../pages/OpportunityDetails'
import SendProposalPage from '../pages/SendProposal'
import PasswordRecoveryPage from '../pages/PasswordRecovery'
import PasswordResetPage from '../pages/PasswordReset'
import OrdersPage from '../pages/Orders'
import ServiceOrderPage from '../pages/ServiceOrder'
import ProviderGuard from '../components/ProviderGuard'
import ProviderLayout from '../components/layout/ProviderLayout'
import { getCurrentLocation, getScreenPath, handleInternalLink } from '../services/navigation'

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
  '/ativar-fornecedor': () => <RegisterPage activation />,
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

export default function AppRoutes() {
  const location = useSyncExternalStore(subscribeToLocation, getCurrentLocation)
  const currentPath = getScreenPath(location)
  const Screen = screens[currentPath] ?? LoginPage

  useEffect(() => {
    const onClick = event => handleInternalLink(event, path => Object.hasOwn(screens, path))
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  const screen = <Screen key={location} />
  if (publicPaths.has(currentPath) || !screens[currentPath]) return screen

  // Keep the guard and professional shell mounted between protected routes.
  // Activation belongs to the authenticated account, before professional access.
  return <ProviderGuard>{currentPath === '/ativar-fornecedor'
    ? screen
    : <ProviderLayout currentPath={currentPath}>{screen}</ProviderLayout>}
  </ProviderGuard>
}
