import { authSession } from './session.js'
import { getOpportunity } from './opportunities.js'
import { providerCacheKeys } from './providerCacheData.js'
import { providerDataCache, providerDataScope } from './providerDataCache.js'

const preparing = new Set()

// Only links from the authorized feed call this; never scan arbitrary order IDs.
export function prefetchOpportunity(id) {
  const session = authSession.getSnapshot()
  if (!session?.profile || preparing.size >= 2) return
  const scope = providerDataScope(session)
  const key = providerCacheKeys.opportunity(id)
  const identity = `${scope}:${key}`
  if (preparing.has(identity) || providerDataCache.read(scope, key)?.fresh) return
  preparing.add(identity)
  providerDataCache.fetch(scope, key, options => getOpportunity(id, options))
    .catch(() => {}) // A failed prefetch is retried normally by the detail screen.
    .finally(() => preparing.delete(identity))
}
