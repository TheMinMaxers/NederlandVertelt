import test from 'node:test'
import assert from 'node:assert/strict'
import { collectieZeelandPoints } from './collectieZeeland.js'
import { parsePoint } from './sparql.js'
import { preferredDescription } from './heritage.js'

test('published museum addresses roundtrip through the existing detail/Street View coordinate parser', () => {
  const points = collectieZeelandPoints()
  assert.ok(points.length > 0)
  for (const { coordinates, row } of points) {
    assert.deepEqual(parsePoint(row), coordinates)
    assert.equal(row.categories.value, 'museum')
    assert.equal(preferredDescription(row).source, 'Collectie Zeeland')
    assert.ok(row.addressSource.value.includes('bag.basisregistraties.overheid.nl'))
    assert.ok(row.item.value.startsWith('https://collectiezeeland.nl/participant/'))
    assert.ok(coordinates[0] > 51 && coordinates[0] < 52)
    assert.ok(coordinates[1] > 3 && coordinates[1] < 5)
    for (const object of row.collectionItems) {
      assert.ok(object.title)
      assert.ok(object.url.startsWith('https://zoeken.collectiezeeland.nl/detail.php?id='))
    }
  }
})

test('invalid or missing object coordinates never produce map markers', () => {
  const locations = [null, [], [91, 4], [51, 181], [NaN, 4], ['51', 4]].map(coordinates => ({ coordinates }))
  assert.deepEqual(collectieZeelandPoints({ locations }), [])
})
