export const REGISTRATION_UNCERTAIN_MESSAGE = 'Não foi possível confirmar a conclusão do cadastro. Ele pode já ter sido criado. Se tentar novamente, utilize os mesmos dados e credenciais.'

export class ApiError extends Error {
  constructor(message, { status = null, uncertain = false } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.uncertain = uncertain
  }
}

function abortError() {
  return new DOMException('Solicitação cancelada.', 'AbortError')
}

function getApiEndpoint(path, apiUrl) {
  let base
  try {
    base = new URL(typeof apiUrl === 'string' ? apiUrl.trim() : '')
  } catch {
    throw new ApiError('O serviço está indisponível no momento. Tente novamente mais tarde.')
  }

  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
    throw new ApiError('O serviço está indisponível no momento. Tente novamente mais tarde.')
  }

  return `${base.href.replace(/\/+$/, '')}${path}`
}

function httpError(status, write) {
  if (!write) {
    return new ApiError('Não foi possível consultar o serviço. Tente novamente.', { status })
  }

  if (status === 400) {
    return new ApiError('Confira os dados do cadastro e os limites dos campos antes de enviar novamente.', { status })
  }

  if (status === 409) {
    return new ApiError('Não foi possível concluir o cadastro com estes dados. Confira se e-mail e documento já foram usados. Se iniciou o cadastro anteriormente, confirme o e-mail quando solicitado e utilize as mesmas credenciais.', { status })
  }

  if (status === 429) {
    return new ApiError('Muitas solicitações em pouco tempo. Aguarde antes de tentar novamente.', { status })
  }

  const uncertain = status >= 500 || (status >= 200 && status < 400)
  return new ApiError(uncertain ? REGISTRATION_UNCERTAIN_MESSAGE : 'Não foi possível concluir o cadastro neste momento. Tente novamente mais tarde.', { status, uncertain })
}

export async function requestJson(path, {
  method = 'GET',
  body,
  expectedStatus = 200,
  signal,
  apiUrl = import.meta.env?.VITE_API_URL,
  fetchImpl = globalThis.fetch,
  timeoutMs = method === 'POST' ? 90000 : 15000,
} = {}) {
  const write = method === 'POST'
  const endpoint = getApiEndpoint(path, apiUrl)
  if (signal?.aborted) {
    if (!write) throw abortError()
    throw new ApiError(REGISTRATION_UNCERTAIN_MESSAGE, { uncertain: true })
  }

  let serializedBody
  try {
    serializedBody = body === undefined ? undefined : JSON.stringify(body)
  } catch {
    throw new ApiError('Confira os dados do cadastro antes de enviar novamente.')
  }

  const controller = new AbortController()
  const cancel = () => controller.abort()
  signal?.addEventListener('abort', cancel, { once: true })
  const timeout = setTimeout(cancel, timeoutMs)
  let response

  try {
    response = await fetchImpl(endpoint, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: serializedBody }),
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
      signal: controller.signal,
    })

    if (response.status !== expectedStatus) throw httpError(response.status, write)
    const contentType = response.headers.get('content-type') ?? ''
    if (!/^application\/(?:[\w.+-]*\+)?json(?:\s*;|$)/i.test(contentType)) {
      throw new ApiError(write ? REGISTRATION_UNCERTAIN_MESSAGE : 'O serviço retornou uma resposta inválida. Tente novamente.', {
        status: response.status,
        uncertain: write,
      })
    }

    return await response.json()
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (signal?.aborted && !write) throw abortError()
    throw new ApiError(write ? REGISTRATION_UNCERTAIN_MESSAGE : 'Não foi possível conectar ao serviço. Verifique sua conexão e tente novamente.', {
      status: response?.status ?? null,
      uncertain: write,
    })
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', cancel)
  }
}
