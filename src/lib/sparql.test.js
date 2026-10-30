import test from 'node:test'
import assert from 'node:assert/strict'
import { parsePoint, parseResults } from './sparql.js'
const value = value => ({ type: 'literal', value })

test('reads decimal coordinates including zero and alternate column names', () => {
  assert.deepEqual(parsePoint({ lat: value('52.1'), lon: value('5.2') }), [52.1, 5.2])
  assert.deepEqual(parsePoint({ latitude: value('0'), longitude: value('-180') }), [0, -180])
})
test('reads WKT in longitude latitude order and accepts CRS84', () => {
  assert.deepEqual(parsePoint({ coord: value('Point(4.9 52.3)') }), [52.3, 4.9])
  assert.deepEqual(parsePoint({ wkt: value('<http://www.opengis.net/def/crs/OGC/1.3/CRS84> POINT(5e0 52)') }), [52, 5])
})
test('rejects missing, blank, invalid, out of range or unsupported CRS coordinates', () => {
  for (const row of [{}, { lat: value(''), lon: value('5') }, { lat: value('NaN'), lon: value('5') }, { lat: value('91'), lon: value('5') }, { coord: value('POINT(181 52)') }, { coord: value('<http://example.org/projected> POINT(5 52)') }]) {
    assert.equal(parsePoint(row), null)
  }
})
test('counts skipped rows and rejects non-SELECT responses', () => {
  const result = parseResults({ results: { bindings: [{ coord: value('Point(5 52)') }, {}] } })
  assert.equal(result.points.length, 1)
  assert.equal(result.skipped, 1)
  assert.deepEqual(parseResults({ results: { bindings: [] } }).points, [])
  assert.throws(() => parseResults({ boolean: true }), /SELECT/)
})

test('fetches configured queries and converts results into map points', async (t) => {
  const { fetchGeodata } = await import('./sparql.js')
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url.searchParams.get('query'), 'SELECT ?lat ?lon WHERE {}')
    assert.equal(options.headers.Accept, 'application/sparql-results+json')
    return { ok: true, json: async () => ({ results: { bindings: [{ lat: value('52'), lon: value('5') }] } }) }
  })
  const result = await fetchGeodata({ endpoint: 'https://example.org/sparql', query: 'SELECT ?lat ?lon WHERE {}' })
  assert.deepEqual(result.points[0].coordinates, [52, 5])
  t.mock.restoreAll()
})

test('reports endpoint HTTP errors', async (t) => {
  const { querySparql } = await import('./sparql.js')
  t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 503 }))
  await assert.rejects(querySparql({ endpoint: 'https://example.org/sparql', query: 'SELECT * WHERE {}' }), /503/)
  t.mock.restoreAll()
})

// Shape verified against the live Zeeland bridge query response.
test('plots Wikidata bridge bindings with optional town information', () => {
  const result = parseResults({ results: { bindings: [
    { bridge: { type: 'uri', value: 'http://www.wikidata.org/entity/Q21088581' },
      bridgeLabel: value('Spoorbrug over het Schelde-Rijnkanaal'),
      coord: value('Point(4.234444 51.428611)') },
  ] } })
  assert.equal(result.skipped, 0)
  assert.deepEqual(result.points[0].coordinates, [51.428611, 4.234444])
})
