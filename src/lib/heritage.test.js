import test from 'node:test'
import assert from 'node:assert/strict'
import { monumentNumbers, heritageQuery, joinHeritage, fetchHeritage, formatRegistrationDate } from './heritage.js'
const literal = value => ({ type: 'literal', value })

test('joins on monument number, preserves multiple registrations and excludes unrelated records', () => {
  const row = { rijksmonumentnummer: literal(' 12660 |12860|12660') }
  const records = ['12660', '999', '12860'].map(number => ({ rijksmonumentnummer: literal(number), omschrijving: literal('Omschrijving') }))
  assert.deepEqual(monumentNumbers(row), ['12660', '12860'])
  assert.deepEqual(joinHeritage(row, records), [records[0], records[2]])
  assert.deepEqual(joinHeritage({}, records), [])
})

test('queries exact identifiers and rejects query injection', () => {
  assert.match(heritageQuery(['12660']), /VALUES \?rijksmonumentnummer \{ "12660" \}/)
  assert.match(heritageQuery(['12660']), /ceo:heeftOmschrijving\/ceo:omschrijving/)
  assert.match(heritageQuery(['12660']), /ceo:datumInschrijvingInMonumentenregister/)
  assert.throws(() => heritageQuery(['" } UNION {']), /Invalid/)
})

test('leaves non-monuments unenriched without a request', async () => {
  assert.deepEqual(await fetchHeritage({}), [])
})

test('excludes matching registrations with missing or blank descriptions', () => {
  const row = { rijksmonumentnummer: literal('12660') }
  const records = [undefined, '', ' \n\t ', 'Een monument.'].map(description => ({
    rijksmonumentnummer: literal('12660'),
    ...(description === undefined ? {} : { omschrijving: literal(description) }),
  }))
  assert.deepEqual(joinHeritage(row, records), [records[3]])
})

test('formats registration dates as Dutch dates', () => {
  assert.equal(formatRegistrationDate('1968-07-02'), '2 juli 1968')
  assert.equal(formatRegistrationDate('1968-07-02T00:00:00Z'), '2 juli 1968')
})

test('fetches and joins the verified Nisse response while ignoring other identifiers', async (t) => {
  const row = { itemLabel: literal('station Nisse'), rijksmonumentnummer: literal('509157') }
  const record = { rijksmonumentnummer: literal('509157'), omschrijving: literal('Tramstation Nisse'), datumInschrijving: literal('1998-02-11') }
  t.mock.method(globalThis, 'fetch', async url => {
    assert.equal(url.hostname, 'api.linkeddata.cultureelerfgoed.nl')
    assert.match(url.searchParams.get('query'), /"509157"/)
    return { ok: true, json: async () => ({ results: { bindings: [record, { rijksmonumentnummer: literal('999') }] } }) }
  })
  try {
    assert.deepEqual(await fetchHeritage(row), [record])
    assert.equal(formatRegistrationDate(record.datumInschrijving.value), '11 februari 1998')
  } finally { t.mock.restoreAll() }
})

test('prefers RCE descriptions and falls back to Wikidata for absent or blank RCE text', async () => {
  const { preferredDescription } = await import('./heritage.js')
  const row = { itemDescription: literal('Wikidata-omschrijving') }
  assert.deepEqual(preferredDescription(row, [{ omschrijving: literal('RCE-omschrijving') }]), { text: 'RCE-omschrijving', source: 'RCE' })
  assert.deepEqual(preferredDescription(row, [{ omschrijving: literal(' \n ') }]), { text: 'Wikidata-omschrijving', source: 'Wikidata' })
  assert.deepEqual(preferredDescription(row), { text: 'Wikidata-omschrijving', source: 'Wikidata' })
  assert.equal(preferredDescription({}), null)
})
