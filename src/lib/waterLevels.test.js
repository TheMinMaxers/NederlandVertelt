import test from 'node:test'
import assert from 'node:assert/strict'
import { parseWaterLevels, isOldWaterReading, waterHeight } from './waterLevels.js'
const series = (date, value, overrides = {}) => ({
  AquoMetadata: { Grootheid: { Code: 'WATHTE' }, Hoedanigheid: { Code: 'NAP' }, Eenheid: { Code: 'cm' }, ProcesType: 'meting', ...overrides },
  Locatie: { Code: 'vlissingen', Naam: 'Vlissingen', Lat: 51.442, Lon: 3.6 },
  MetingenLijst: [{ Tijdstip: date, Meetwaarde: { Waarde_Numeriek: value }, WaarnemingMetadata: { Kwaliteitswaardecode: '00', Statuswaarde: 'Ongecontroleerd' } }],
})
test('selects the newest measured NAP height, converts centimeters and preserves provenance', () => {
  const result = parseWaterLevels({ Succesvol: true, WaarnemingenLijst: [series('2026-01-01T00:00:00Z', 189), series('2026-10-31T08:30:00Z', -94)] }, Date.parse('2026-10-31T09:00:00Z'))
  assert.equal(result.length, 1)
  assert.equal(result[0].metersNAP, -.94)
  assert.equal(result[0].measuredAt, '2026-10-31T08:30:00Z')
  assert.equal(result[0].status, 'Ongecontroleerd')
  assert.deepEqual(result[0].coordinates, [51.442, 3.6])
})
test('rejects predictions, wrong datum, missing values, bad quality and future readings', () => {
  const time = '2026-10-31T08:30:00Z'
  const badQuality = series(time, 10)
  badQuality.MetingenLijst[0].WaarnemingMetadata.Kwaliteitswaardecode = '99'
  assert.deepEqual(parseWaterLevels({ Succesvol: true, WaarnemingenLijst: [series(time, 10, { ProcesType: 'verwachting' }), series(time, 10, { Hoedanigheid: { Code: 'MSL' } }), series(time, 999999999), series(time, null), series('2027-01-01T00:00:00Z', 10), badQuality] }, Date.parse('2026-10-31T09:00:00Z')), [])
  assert.throws(() => parseWaterLevels({ Succesvol: false }))
})
test('marks old measurements and formats heights without implying water depth', () => {
  const now = Date.parse('2026-10-31T12:00:00Z')
  assert.equal(isOldWaterReading('2026-10-31T11:00:00Z', now), false)
  assert.equal(isOldWaterReading('2026-10-31T09:00:00Z', now), true)
  assert.equal(isOldWaterReading('invalid', now), true)
  assert.equal(waterHeight(-.94), '-0,94 m NAP')
})
