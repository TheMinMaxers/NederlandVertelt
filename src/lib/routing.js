const ROUTING_ENDPOINT = 'https://api.openrouteservice.org/v2/directions/foot-walking/geojson'

export async function calculateWalkingRoute({
  start,
  destination,
  apiKey = import.meta.env?.VITE_ORS_API_KEY,
  signal,
}) {
  const validateCoordinates = (coordinates, label) => {
    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
      throw new Error(`${label}: ongeldige coördinaten.`)
    }
    const [lat, lon] = coordinates
    if (!Number.isFinite(lat) || !Number.isFinite(lon) ||
        Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      throw new Error(`${label}: coördinaten buiten het geldige bereik.`)
    }
  }

  validateCoordinates(start, 'Startlocatie')
  validateCoordinates(destination, 'Bestemming')

  if (!apiKey) {
    throw new Error('De wandelroutefunctie is nog niet geconfigureerd: de OpenRouteService API-sleutel ontbreekt.')
  }

  const response = await fetch(ROUTING_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/geo+json',
    },
    body: JSON.stringify({
      // OpenRouteService expects [longitude, latitude].
      coordinates: [
        [start[1], start[0]],
        [destination[1], destination[0]],
      ],
      preference: 'shortest',
      instructions: false,
    }),
    signal,
  })

  if (!response.ok) {
    let message = ''
    try {
      message = await response.text()
    } catch {
      // Keep the HTTP status as the useful fallback.
    }
    throw new Error(`De routedienst gaf HTTP ${response.status}${message ? `: ${message.slice(0, 240)}` : '.'}`)
  }

  const data = await response.json()
  const feature = data.features?.[0]
  const summary = feature?.properties?.summary

  if (
    feature?.geometry?.type !== 'LineString' ||
    !Array.isArray(feature.geometry.coordinates) ||
    !Number.isFinite(summary?.distance) ||
    !Number.isFinite(summary?.duration)
  ) {
    throw new Error('De routedienst heeft geen geldige wandelroute teruggegeven.')
  }

  return {
    geometry: feature.geometry,
    distance: summary.distance,
    duration: summary.duration,
  }
}

export function formatDistance(meters) {
  if (!Number.isFinite(meters)) return ''
  return meters < 1000
    ? `${Math.round(meters)} m`
    : `${(meters / 1000).toLocaleString('nl-NL', { maximumFractionDigits: 1 })} km`
}

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return ''
  const minutes = Math.max(1, Math.round(seconds / 60))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return remaining ? `${hours} uur ${remaining} min` : `${hours} uur`
}
