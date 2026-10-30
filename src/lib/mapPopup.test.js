import test from 'node:test'
import assert from 'node:assert/strict'
import { constructionYear } from './mapPopup.js'

test('uses the year from Wikidata inception dates', () => {
  assert.equal(constructionYear('1927-01-01T00:00:00Z'), '1927')
  assert.equal(constructionYear('+1650-01-01T00:00:00Z'), '1650')
  assert.equal(constructionYear(), null)
  assert.equal(constructionYear('onbekend'), null)
})
