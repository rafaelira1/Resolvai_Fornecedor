import { createAuthClient } from './auth.js'

function browserStorage(name) {
  try { return typeof window === 'undefined' ? undefined : window[name] }
  catch { return undefined }
}

export const authSession = createAuthClient({
  localStorage: browserStorage('localStorage'),
  sessionStorage: browserStorage('sessionStorage'),
})
