// Configure o endpoint de autenticação; não simule um envio bem-sucedido.
export async function requestPasswordRecovery(email) {
  const endpoint = import.meta.env.VITE_PASSWORD_RECOVERY_URL?.trim()
  if (!endpoint) {
    throw new Error('A recuperação de senha está indisponível no momento. Tente novamente mais tarde.')
  }

  let response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email }),
      signal: AbortSignal.timeout(15000),
    })
  } catch {
    throw new Error('Não foi possível conectar ao serviço. Verifique sua conexão e tente novamente.')
  }

  if (response.status === 429) {
    throw new Error('Muitas solicitações em pouco tempo. Aguarde alguns minutos antes de tentar novamente.')
  }
  if (!response.ok || response.headers.get('content-type')?.includes('text/html')) {
    throw new Error('Não foi possível solicitar a recuperação agora. Tente novamente mais tarde.')
  }
}
