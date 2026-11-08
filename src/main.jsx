import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { passwordRecovery } from './services/passwordRecovery.js'

passwordRecovery.captureSession(window.location, window.history)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
