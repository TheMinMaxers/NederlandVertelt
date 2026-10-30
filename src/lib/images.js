export function safeUrl(value) {
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    url.protocol = 'https:'
    return url.href
  } catch { return null }
}

export function imageUrls(row) {
  return [...new Set((row.images?.value || row.image?.value || '').split('|').map(safeUrl).filter(Boolean))]
}

export function thumbnail(value, width = 1200) {
  const safe = safeUrl(value)
  if (!safe) return null
  const url = new URL(safe)
  if (url.hostname === 'commons.wikimedia.org' && url.pathname.startsWith('/wiki/Special:FilePath/')) {
    url.searchParams.set('width', String(width))
  }
  return url.href
}

export function imageSource(value) {
  const safe = safeUrl(value)
  if (!safe) return null
  const url = new URL(safe)
  const prefix = '/wiki/Special:FilePath/'
  if (url.hostname === 'commons.wikimedia.org' && url.pathname.startsWith(prefix)) {
    url.pathname = `/wiki/File:${url.pathname.slice(prefix.length)}`
    url.search = ''
  }
  return url.href
}
