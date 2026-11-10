export function createLoginFlow({ auth, loadProfile, onState, onSuccess }) {
  let operation = null
  function cancel() {
    const abandoned = operation
    operation = null
    abandoned?.abort()
  }
  async function submit(credentials) {
    if (operation) return
    const controller = new AbortController()
    operation = controller
    const isCurrent = () => operation === controller && !controller.signal.aborted
    onState({ loading: true, error: '' })
    try {
      const session = await auth.login({ ...credentials, signal: controller.signal })
      if (!isCurrent()) return
      if (session?.providerProfileStatus === 'pending') {
        operation = null
        onSuccess('/ativar-fornecedor')
        return
      }
      await loadProfile({ auth, signal: controller.signal })
      if (!isCurrent()) return
      // A successful navigation unmounts the form; the completed session remains.
      operation = null
      onSuccess('/home')
    } catch (failure) {
      if (!isCurrent()) return
      operation = null
      // Abort invalidates only this login generation, never a newer session.
      controller.abort()
      onState({ loading: false, error: failure.message || 'Não foi possível acessar sua conta. Tente novamente.' })
    }
  }
  return { submit, cancel }
}
