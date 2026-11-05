import { useSyncExternalStore } from 'react'
import { authSession } from '../services/session.js'

export function useProviderSession() {
  return useSyncExternalStore(authSession.subscribe, authSession.getSnapshot)
}
