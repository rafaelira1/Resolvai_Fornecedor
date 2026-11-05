import { useEffect, useState } from 'react'
import { useProviderSession } from '../hooks/useProviderSession'
import { getProviderProfile } from '../services/fornecedores'

export default function ProviderGuard({ children }) {
  const session = useProviderSession()
  const [state, setState] = useState({ loading: true, error: '' })
  const [reload, setReload] = useState(0)
  const userId = session?.user.id
  const expiresAt = session?.expiresAtUtc

  function retry() {
    setState({ loading: true, error: '' })
    setReload((value) => value + 1)
  }

  useEffect(() => {
    if (!userId) { window.location.replace('/login'); return }
    const controller = new AbortController()
    getProviderProfile({ signal: controller.signal })
      .then(() => { if (!controller.signal.aborted) setState({ loading: false, error: '' }) })
      .catch((error) => { if (!controller.signal.aborted) setState({ loading: false, error: error.message }) })
    return () => controller.abort()
  }, [userId, reload])

  useEffect(() => {
    if (!expiresAt) return
    const timer = setTimeout(() => {
      setState({ loading: true, error: '' })
      setReload((value) => value + 1)
    }, Math.min(Math.max(0, Date.parse(expiresAt) - Date.now()), 2147483647))
    return () => clearTimeout(timer)
  }, [expiresAt])

  if (!session) return <main className="auth-gate" role="status">Redirecionando para o acesso profissional…</main>
  if (state.loading) return <main className="auth-gate" role="status">Carregando sua conta profissional…</main>
  if (state.error) return <main className="auth-gate"><p role="alert">{state.error}</p><button type="button" onClick={retry}>Tentar novamente</button><a href="/login">Voltar ao acesso</a></main>
  return children
}
