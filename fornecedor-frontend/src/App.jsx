import './App.css'
import LoginPage from './pages/LoginPage'

const screens = {
  '/': LoginPage,
  '/login': LoginPage,
}

function App() {
  const Screen = screens[window.location.pathname] ?? LoginPage

  return <Screen />
}

export default App
