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
    if (!response.ok) throw new Error(`SPARQL endpoint returned HTTP ${response.status}.`)
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

//Navid's toegevoegde code voor GPS-route start

// ============================================
// ROUTING CONFIGURATION
// ============================================
const ROUTING_ENDPOINT =
  'https://api.openrouteservice.org/v2/directions/foot-walking/geojson'

// Supply your OpenRouteService API key.
const ORS_API_KEY = 'YOUR_ORS_API_KEY'

// ============================================
// 2. CALCULATE SHORTEST WALKING ROUTE
// ============================================
export async function calculateWalkingRoute({
  start,
  destination,
  apiKey = ORS_API_KEY,
  signal
}) {
  if (!Array.isArray(start) || start.length !== 2) {
    throw new Error('Invalid starting coordinates.')
  }
  if (!Array.isArray(destination) || destination.length !== 2) {
    throw new Error('Invalid destination coordinates.')
  }
  const [startLat, startLon] = start
  const [endLat, endLon] = destination
  for (const [lat, lon] of [start, destination]) {
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      Math.abs(lat) > 90 ||
      Math.abs(lon) > 180
    ) {
      throw new Error('Coordinates are outside valid geographic ranges.')
    }
  }
  if (!apiKey || apiKey === 'YOUR_ORS_API_KEY') {
    throw new Error('A valid OpenRouteService API key is required.')
  }
  const response = await fetch(ROUTING_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/geo+json'
    },
    body: JSON.stringify({
      // GeoJSON and OpenRouteService use longitude first.
      coordinates: [
        [startLon, startLat],
        [endLon, endLat]
      ],
      // Optimize for shortest distance.
      preference: 'shortest',
      instructions: false,
      geometry: true
    }),
    signal
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `Routing service error (${response.status}): ${errorText}`
    )
  }
  const data = await response.json()
  const route = data.features?.[0]
  if (
    !route ||
    route.geometry?.type !== 'LineString' ||
    !Array.isArray(route.geometry.coordinates)
  ) {
    throw new Error('The routing service returned no valid route.')
  }
  const summary = route.properties?.summary
  if (
    !Number.isFinite(summary?.distance) ||
    !Number.isFinite(summary?.duration)
  ) {
    throw new Error('The routing service returned invalid route information.')
  }
  return {
    geometry: route.geometry,
    distance: summary.distance,
    duration: summary.duration,
    raw: route
  }
}

// ============================================
// 5. DRAW ROUTE ON LEAFLET MAP
// ============================================
export function displayRoute(map, route) {
  const coordinates = route.geometry.coordinates.map(
    ([lon, lat]) => [lat, lon]
  )
  const routeLayer = L.polyline(coordinates, {
    color: '#2563eb',
    weight: 6,
    opacity: 0.85,
    lineJoin: 'round'
  }).addTo(map)
  map.fitBounds(routeLayer.getBounds(), {
    padding: [50, 50]
  })
  return routeLayer
}

// ============================================
// 6. FORMAT DISTANCE AND TIME
// ============================================
export function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)} metres`
  }
  return `${(meters / 1000).toFixed(2)} km`
}
export function formatDuration(seconds) {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) {
    return `${minutes} minutes`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours} hours ${remainingMinutes} minutes`
}

// ============================================
// 7. EXTRACT DESTINATION LABEL
// ============================================
export function getDestinationLabel(row, index) {
  const label =
    row?.label?.value ??
    row?.cityLabel?.value ??
    row?.name?.value ??
    row?.itemLabel?.value
  return label || `Destination ${index + 1}`
}

// ============================================
// 8. INITIALIZE THE COMPLETE MAP
// ============================================
export async function initializeGeodataMap({
  endpoint,
  query,
  mapElement = 'map',
  infoElement = 'route-info',
  apiKey = ORS_API_KEY
}) {
  const map = L.map(mapElement).setView(
    [52.3676, 4.9041],
    12
  )
  L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      attribution:
        '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }
  ).addTo(map)

  const info = document.getElementById(infoElement)

  const setInfo = message => {
    if (info) info.textContent = message
  }
  let userCoordinates
  let userMarker
  let destinationMarker
  let routeLayer
  let activeRequest
  try {
    setInfo('Obtaining your current location...')
    userCoordinates = await getUserLocation()
    userMarker = displayUserLocation(
      map,
      userCoordinates
    )
    map.setView(userCoordinates, 13)
    setInfo('Loading geographic destinations...')
    const result = await fetchGeodata({
      endpoint,
      query
    })
    if (!result.points.length) {
      throw new Error('No valid geographic destinations found.')
    }

    // Add every valid SPARQL destination to the map.
    result.points.forEach((point, index) => {
      const label = getDestinationLabel(
        point.row,
        index
      )

      const marker = L.marker(
        point.coordinates
      ).addTo(map)
      marker.bindPopup(
        document.createTextNode(label)
      )

      // Calculate a route when the user selects a destination.
      marker.on('click', async () => {
        try {
          if (activeRequest) {
            activeRequest.abort()
          }
          activeRequest = new AbortController()
          const currentRequest = activeRequest
          setInfo(`Calculating shortest walking route to ${label}...`)
          const route = await calculateWalkingRoute({
            start: userCoordinates,
            destination: point.coordinates,
            apiKey,
            signal: currentRequest.signal
          })

          // Ignore results from superseded requests.
          if (currentRequest !== activeRequest) return
          if (routeLayer) {
            map.removeLayer(routeLayer)
          }
          if (destinationMarker) {
            map.removeLayer(destinationMarker)
          }
          routeLayer = displayRoute(map, route)
          destinationMarker = displayDestination(
            map,
            point.coordinates,
            label
          )

          marker.openPopup()
          setInfo(
            `Destination: ${label}\n` +
            `Walking distance: ${formatDistance(route.distance)}\n` +
            `Estimated walking time: ${formatDuration(route.duration)}\n` +
            `Optimization: Shortest distance`
          )

        } catch (error) {
            if (error.name === 'AbortError') return
            setInfo(`Route error: ${error.message}`)
        }
      })
    })

    setInfo(
      `${result.points.length} destinations loaded. ` +
      `${result.skipped} invalid coordinates skipped. ` +
      'Select a destination marker to calculate a walking route.'
    )

    return {
      map,
      result,
      userCoordinates,
      userMarker
    }

  } catch (error) {
    setInfo(error.message)
    throw error
  }
}
//Navid's toegevoegde code voor GPS-route eind
