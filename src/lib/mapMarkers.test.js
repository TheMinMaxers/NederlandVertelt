import test from 'node:test'
import assert from 'node:assert/strict'
import { spreadMarkers, markerSize, markerGap, categoryIcons } from './mapMarkers.js'

function assertSeparated(points) {
  for (let i = 0; i < points.length; i++) for (let j = 0; j < i; j++) {
    assert.ok(Math.abs(points[i].x - points[j].x) >= markerSize + markerGap || Math.abs(points[i].y - points[j].y) >= markerSize + markerGap)
  }
}
test('coincident markers and adjacent groups stay separate, including displaced icons', () => {
  const points = Array.from({ length: 100 }, (_, i) => ({ x: (i % 4) * 20, y: (i % 3) * 30 }))
  const result = spreadMarkers(points)
  assertSeparated(result)
  assert.ok(result.some(point => point.moved))
  assert.deepEqual(spreadMarkers(points), result)
  assert.deepEqual(points[0], { x: 0, y: 0 })
})
test('isolated icons stay at their geographical positions', () => {
  assert.deepEqual(spreadMarkers([{ x: -100, y: 10 }, { x: 100, y: 10 }]), [{ x: -100, y: 10, moved: false }, { x: 100, y: 10, moved: false }])
  assert.deepEqual(spreadMarkers([]), [])
  assert.deepEqual(Object.keys(categoryIcons).sort(), ['bridge', 'flood-control', 'museum'])
})
