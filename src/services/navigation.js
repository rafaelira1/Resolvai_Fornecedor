const normalizedPath = path => path.replace(/\/$/, '') || '/'

export function navigateTo(href, { replace = false } = {}) {
  const url = new URL(href, window.location.href)
  if (url.origin !== window.location.origin) {
    window.location.assign(url.href)
    return
  }
  const destination = url.pathname + url.search + url.hash
  const current = window.location.pathname + window.location.search + window.location.hash
  if (destination === current) return
  window.history[replace ? 'replaceState' : 'pushState'](null, '', destination)
  window.dispatchEvent(new Event('popstate'))
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
}

export function handleInternalLink(event, canNavigate) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  const link = event.target?.closest?.('a[href]')
  if (!link || link.hasAttribute('download') || link.hasAttribute('data-full-navigation')
    || (link.target && link.target.toLowerCase() !== '_self')) return
  const href = link.getAttribute('href')
  if (!href || href.startsWith('#')) return
  let url
  try { url = new URL(href, window.location.href) } catch { return }
  if (url.origin !== window.location.origin || !['http:', 'https:'].includes(url.protocol)
    || !canNavigate(normalizedPath(url.pathname))) return
  event.preventDefault()
  navigateTo(url.href)
}

export function getCurrentLocation() {
  return window.location.pathname + window.location.search + window.location.hash
}

export function getScreenPath(location) {
  const url = new URL(location, 'http://router.local')
  const path = normalizedPath(url.pathname)
  return (path === '/' || path === '/login') && url.hash === '#recuperar-senha' ? '/recuperar-senha' : path
}
