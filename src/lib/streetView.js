export function streetViewEmbedUrl(coordinates, apiKey) {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return null
  const [lat, lon] = coordinates
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180 || !apiKey?.trim()) return null
  const url = new URL('https://www.google.com/maps/embed/v1/streetview')
  url.searchParams.set('key', apiKey.trim())
  url.searchParams.set('location', `${lat},${lon}`)
  url.searchParams.set('language', 'nl')
  return url.href
}
