import './App.css'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import LegalPage from './pages/LegalPage'
import RegisterPage from './pages/RegisterPage'
import ProviderProfilePage from './pages/ProviderProfilePage'
import OpportunitiesPage from './pages/OpportunitiesPage'
import OrderDetailsPage from './pages/OrderDetailsPage'
import ProposalPage from './pages/ProposalPage'

const screens = {
  '/': LoginPage,
  '/login': LoginPage,
  '/home': HomePage,
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

function App() {
  const currentPath = window.location.pathname.replace(/\/$/, '') || '/'
  const Screen = screens[currentPath] ?? LoginPage

  return <Screen />
}

export default App
