const accents = 'áàâãäéèêëíìîïóòôõöúùûüç'
const plain = 'aaaaaeeeeiiiiooooouuuuc'
const normalize = value => String(value ?? '').toLowerCase().replace(/^ +| +$/g, '')
  .replace(/[áàâãäéèêëíìîïóòôõöúùûüç]/g, letter => plain[accents.indexOf(letter)])
  .replace(/[\t\n\v\f\r _-]+/g, ' ')

export function opportunityFilters(key) {
  if (typeof key !== 'string' || !key.startsWith('opportunities:')) return null
  try {
    const value = JSON.parse(key.slice('opportunities:'.length))
    return value && Number.isSafeInteger(value.page) && value.page > 0
      && Number.isSafeInteger(value.pageSize) && value.pageSize > 0 && value.pageSize <= 50
      && typeof value.search === 'string' && typeof value.category === 'string'
      && ['recent', 'proposals'].includes(value.sort) ? value : null
  } catch { return null }
}

// Never filter a partial server page as if it represented all opportunities.
export function deriveOpportunityPage(key, entries) {
  const wanted = opportunityFilters(key)
  if (!wanted) return null
  const candidates = [...(entries ?? [])].filter(([sourceKey, entry]) => {
    const filter = opportunityFilters(sourceKey)
    return filter?.page === 1 && filter.sort === 'recent' && !filter.category && !filter.search
      && Array.isArray(entry.data?.items) && entry.data.totalItems === entry.data.items.length
  }).sort((a, b) => b[1].at - a[1].at)
  const source = candidates[0]?.[1]
  if (!source) return null
  const search = normalize(wanted.search?.trim())
  let items = source.data.items.filter(item => (!wanted.category || item.specialtyCode === wanted.category)
    && (!search || normalize([item.title, item.category, item.location].filter(value => value != null).join(' ')).includes(search)))
  // Stable sort preserves the server's order, including timestamps with sub-ms precision.
  if (wanted.sort === 'proposals') items = [...items].sort((a, b) => a.proposalsCount - b.proposalsCount)
  const totalItems = items.length
  return { at: source.at, data: { ...source.data, page: wanted.page, pageSize: wanted.pageSize,
    totalItems, totalPages: Math.ceil(totalItems / wanted.pageSize),
    items: items.slice((wanted.page - 1) * wanted.pageSize, wanted.page * wanted.pageSize) } }
}
