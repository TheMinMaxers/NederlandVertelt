// Reusable transport for application-owned SELECT queries.
export async function querySparql({ endpoint, query, signal, timeoutMs = 30000 }) {
  const url = new URL(endpoint)
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Expected an HTTP(S) SPARQL endpoint.')
  if (!query?.trim()) throw new Error('A SPARQL query is required.')
  url.searchParams.set('query', query)
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (signal?.aborted) controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  const timeout = setTimeout(abort, timeoutMs)
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/sparql-results+json' },
      signal: controller.signal,
    })
    if (!response.ok) {
      const error = new Error(`SPARQL endpoint returned HTTP ${response.status}.`)
      error.status = response.status
      throw error
    }
    const data = await response.json()
    if (!Array.isArray(data?.results?.bindings)) throw new Error('Expected SPARQL SELECT JSON results.')
    return data
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}

export async function fetchGeodata(options) {
  return parseResults(await querySparql(options))
}

// Accept WGS84 decimal degrees or OGC/Wikidata Point(longitude latitude).
export function parsePoint(row) {
  const latitude = row?.lat?.value ?? row?.latitude?.value
  const longitude = row?.lon?.value ?? row?.lng?.value ?? row?.longitude?.value
  let lat, lon
  if (latitude !== undefined && longitude !== undefined) {
    if (!String(latitude).trim() || !String(longitude).trim()) return null
    lat = Number(latitude)
    lon = Number(longitude)
  } else {
    const wkt = row?.coord?.value ?? row?.location?.value ?? row?.wkt?.value
    const match = typeof wkt === 'string' && wkt.match(/^\s*(?:<http:\/\/www\.opengis\.net\/def\/crs\/OGC\/1\.3\/CRS84>\s*)?POINT\s*\(\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s+([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*\)\s*$/i)
    if (!match) return null
    lon = Number(match[1])
    lat = Number(match[2])
  }
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
    ? [lat, lon] : null
}

export function parseResults(data) {
  if (!Array.isArray(data?.results?.bindings)) {
    throw new Error('Geen SPARQL SELECT-resultaat ontvangen. Gebruik een SELECT-query met coördinaten.')
  }
  const points = []
  let skipped = 0
  for (const row of data.results.bindings) {
    const coordinates = parsePoint(row)
    if (coordinates) points.push({ coordinates, row })
    else skipped++
  }
  return { points, skipped }
}
