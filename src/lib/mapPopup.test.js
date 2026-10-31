import test from 'node:test'
import assert from 'node:assert/strict'
import { constructionYear, locationYear } from './mapPopup.js'

test('uses the year from Wikidata inception dates', () => {
  assert.equal(constructionYear('1927-01-01T00:00:00Z'), '1927')
  assert.equal(constructionYear('+1650-01-01T00:00:00Z'), '1650')
  assert.equal(constructionYear(), null)
  assert.equal(constructionYear('onbekend'), null)
})


test('uses opening year only when the RCE registration and inception dates are unavailable', () => {
  const row = { inception: { value: '1900-01-01T00:00:00Z' }, officialOpening: { value: '1902-05-01T00:00:00Z' } }
  assert.deepEqual(locationYear(row, [{ datumInschrijving: { value: '1968-07-02' } }]), { year: '1968', label: 'Ingeschreven als rijksmonument in', source: 'RCE' })
  assert.deepEqual(locationYear(row), { year: '1900', label: 'Gebouwd in', source: 'Wikidata' })
  assert.deepEqual(locationYear({ officialOpening: row.officialOpening }), { year: '1902', label: 'Geopend in', source: 'Wikidata' })
  assert.equal(locationYear({}), null)
  assert.equal(locationYear({ officialOpening: { value: 'onbekend' } }), null)
})
