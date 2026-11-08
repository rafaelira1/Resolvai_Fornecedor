import { createAuthClient } from './auth.js'

function browserStorage(name) {
  try { return typeof window === 'undefined' ? undefined : window[name] }
  catch { return undefined }
}

export const authSession = createAuthClient({
  storageEvents: typeof window === 'undefined' ? undefined : window,
  localStorage: browserStorage('localStorage'),
  sessionStorage: browserStorage('sessionStorage'),
})
