import './App.css'
import LoginPage from './pages/LoginPage'
import LegalPage from './pages/LegalPage'

const screens = {
  '/': LoginPage,
  '/login': LoginPage,
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
