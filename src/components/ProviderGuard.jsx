import { useEffect, useState } from 'react'
import { useProviderSession } from '../hooks/useProviderSession'
import { getProviderProfile } from '../services/fornecedores'

export default function ProviderGuard({ children }) {
  const session = useProviderSession()
  const [state, setState] = useState({ verifiedSession: null, error: '' })
  const [reload, setReload] = useState(0)
  const userId = session?.user.id
  const sessionId = session?.sessionId
  const expiresAt = session?.expiresAtUtc
  const accessToken = session?.accessToken

  function retry() {
    setState({ verifiedSession: null, error: '' })
    setReload((value) => value + 1)
  }

  useEffect(() => {
    if (!userId) { window.location.replace('/login'); return }
    const controller = new AbortController()
    getProviderProfile({ signal: controller.signal })
      .then(() => { if (!controller.signal.aborted) setState({ verifiedSession: sessionId, error: '' }) })
      .catch((error) => { if (!controller.signal.aborted) setState({ verifiedSession: sessionId, error: error.message }) })
    return () => controller.abort()
  }, [userId, sessionId, accessToken, reload])

  useEffect(() => {
    if (!expiresAt) return
    const timer = setTimeout(() => {
      setReload((value) => value + 1)
    }, Math.min(Math.max(0, Date.parse(expiresAt) - Date.now()), 2147483647))
    return () => clearTimeout(timer)
  }, [expiresAt])

  if (!session) return <main className="auth-gate" role="status">Redirecionando para o acesso profissional…</main>
  if (state.verifiedSession !== sessionId) return <main className="auth-gate" role="status">Carregando sua conta profissional…</main>
  if (state.error) return <main className="auth-gate"><p role="alert">{state.error}</p><button type="button" onClick={retry}>Tentar novamente</button><a href="/login">Voltar ao acesso</a></main>
  if (!session.profile) return <main className="auth-gate" role="status">Carregando sua conta profissional…</main>
  return children
}
