import { useEffect, useRef, useState } from 'react'
import { useProviderSession } from './useProviderSession'
import { providerDataCache, providerDataScope } from '../services/providerDataCache'

export function useProviderData(load, { cacheKey = load } = {}) {
  const session = useProviderSession()
  const [refresh, setRefresh] = useState({ sequence: 0, scope: null, key: null })
  const [state, setState] = useState(null)
  const pending = useRef(null)
  const consumed = useRef(0)
  const scope = providerDataScope(session)
  const version = refresh.scope === scope && refresh.key === cacheKey ? refresh.sequence : 0
  const cached = providerDataCache.read(scope, cacheKey)
  const belongs = state?.scope === scope && state.cacheKey === cacheKey
  const current = belongs && state.version === version ? state : null
  const available = current?.data ?? (belongs ? state.data : undefined) ?? cached?.data
  const error = current?.error
  const denied = [401, 403, 404].includes(error?.status)

  useEffect(() => {
    const force = version > consumed.current
    if (force) consumed.current = version
    const saved = providerDataCache.read(scope, cacheKey)
    if (!force && saved?.fresh) {
      let cancelled = false
      Promise.resolve().then(() => { if (!cancelled) setState({ scope, cacheKey, version, data: saved.data }) })
      return () => { cancelled = true }
    }
    const controller = new AbortController()
    pending.current = controller
    providerDataCache.fetch(scope, cacheKey, load, { signal: controller.signal, force })
      .then(data => { if (!controller.signal.aborted) setState({ scope, cacheKey, version, data }) })
      .catch(failure => {
        if (!controller.signal.aborted) setState(previous => ({ scope, cacheKey, version,
          data: ![401, 403, 404].includes(failure.status) && previous?.scope === scope && previous.cacheKey === cacheKey ? previous.data : undefined, error: failure }))
      })
      .finally(() => { if (pending.current === controller) pending.current = null })
    return () => { controller.abort(); if (pending.current === controller) pending.current = null }
  }, [scope, cacheKey, version, load])

  useEffect(() => {
    const update = () => {
      if (!pending.current && !providerDataCache.read(scope, cacheKey)?.fresh) {
        setRefresh(previous => ({ sequence: previous.sequence + 1, scope, key: cacheKey }))
      }
    }
    window.addEventListener('pageshow', update)
    window.addEventListener('focus', update)
    return () => { window.removeEventListener('pageshow', update); window.removeEventListener('focus', update) }
  }, [scope, cacheKey])

  return { data: denied ? undefined : available, error, loading: available === undefined && !error,
    previousData: state?.scope === scope ? state.data : undefined,
    refreshing: !current && (version > 0 || !cached?.fresh),
    reload: () => setRefresh(previous => ({ sequence: previous.sequence + 1, scope, key: cacheKey })) }
}
