import test from 'node:test'
import assert from 'node:assert/strict'
import { streetViewEmbedUrl } from './streetView.js'
test('embeds Google Street View using the clicked coordinates', () => {
 const url = new URL(streetViewEmbedUrl([51.63, 3.70389], 'test-key'))
 assert.equal(url.origin, 'https://www.google.com')
 assert.equal(url.pathname, '/maps/embed/v1/streetview')
 assert.equal(url.searchParams.get('location'), '51.63,3.70389')
 assert.equal(url.searchParams.get('key'), 'test-key')
 assert.equal(url.searchParams.get('language'), 'nl')
})
test('does not load an embed with missing configuration or invalid coordinates', () => {
 assert.equal(streetViewEmbedUrl([51, 3], ''), null)
 assert.equal(streetViewEmbedUrl([91, 3], 'key'), null)
 assert.equal(streetViewEmbedUrl([NaN, 3], 'key'), null)
 assert.equal(streetViewEmbedUrl(null, 'key'), null)
})

test('starts walking navigation to the original marker without an API key', async () => {
 const { walkingNavigationUrl } = await import('./streetView.js')
 const url = new URL(walkingNavigationUrl([51.63, 3.70389]))
 assert.equal(url.pathname, '/maps/dir/')
 assert.equal(url.searchParams.get('destination'), '51.63,3.70389')
 assert.equal(url.searchParams.get('travelmode'), 'walking')
 assert.equal(url.searchParams.get('dir_action'), 'navigate')
 assert.equal(url.searchParams.has('key'), false)
 assert.equal(walkingNavigationUrl([91, 3]), null)
})
