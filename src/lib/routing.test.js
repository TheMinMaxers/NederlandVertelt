import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateWalkingRoute, formatDistance, formatDuration } from './routing.js'

test('formats walking distance and duration in Dutch', () => {
  assert.equal(formatDistance(850), '850 m')
  assert.equal(formatDistance(1250), '1,3 km')
  assert.equal(formatDuration(60), '1 min')
  assert.equal(formatDuration(3660), '1 uur 1 min')
})

test('rejects invalid coordinates and missing API key before fetching', async () => {
  await assert.rejects(
    calculateWalkingRoute({ start: [91, 5], destination: [52, 5], apiKey: 'test' }),
    /buiten het geldige bereik/
  )
  await assert.rejects(
    calculateWalkingRoute({ start: [52, 5], destination: [52.1, 5.1], apiKey: '' }),
    /API-sleutel ontbreekt/
  )
})

test('sends coordinates in longitude-latitude order and parses GeoJSON route', async (t) => {
  const originalFetch = globalThis.fetch
  let request
  globalThis.fetch = async (url, options) => {
    request = { url, options }
    return {
      ok: true,
      json: async () => ({
        features: [{
          geometry: { type: 'LineString', coordinates: [[5, 52], [5.1, 52.1]] },
          properties: { summary: { distance: 1200, duration: 900 } },
        }],
      }),
    }
  }
  t.after(() => { globalThis.fetch = originalFetch })

  const result = await calculateWalkingRoute({
    start: [52, 5],
    destination: [52.1, 5.1],
    apiKey: 'test-key',
  })

  assert.equal(request.url, 'https://api.openrouteservice.org/v2/directions/foot-walking/geojson')
  assert.equal(request.options.method, 'POST')
  assert.equal(request.options.headers.Authorization, 'test-key')
  assert.deepEqual(JSON.parse(request.options.body).coordinates, [[5, 52], [5.1, 52.1]])
  assert.equal(JSON.parse(request.options.body).preference, 'shortest')
  assert.equal(result.distance, 1200)
  assert.equal(result.duration, 900)
})
