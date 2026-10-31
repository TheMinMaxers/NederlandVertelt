import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { waterEndpoint, waterStationCodes, parseWaterLevels } from '../src/lib/waterLevels.js'

const target = new URL('../public/data/water-levels.json', import.meta.url)
const published = 'https://theminmaxers.github.io/NederlandVertelt/data/water-levels.json'
const valid = data => data?.stations?.length && Number.isFinite(Date.parse(data.updatedAt)) && data.stations.every(s => waterStationCodes.includes(s.code) && Number.isFinite(s.metersNAP) && Number.isFinite(Date.parse(s.measuredAt)) && Array.isArray(s.coordinates) && s.coordinates.length === 2 && s.coordinates.every(Number.isFinite))
try {
  const response = await fetch(waterEndpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ LocatieLijst: waterStationCodes.map(Code => ({ Code })), AquoPlusWaarnemingMetadataLijst: [{ AquoMetadata: { Compartiment: { Code: 'OW' }, Grootheid: { Code: 'WATHTE' }, Hoedanigheid: { Code: 'NAP' }, ProcesType: 'meting' } }] }),
    signal: AbortSignal.timeout(30000),
  })
  if (!response.ok) throw new Error(`RWS HTTP ${response.status}`)
  const stations = parseWaterLevels(await response.json())
  // Do not replace a complete snapshot with an incomplete response.
  if (stations.length !== waterStationCodes.length) throw new Error('Niet alle meetstations beschikbaar')
  await mkdir(new URL('../public/data/', import.meta.url), { recursive: true })
  await writeFile(target, JSON.stringify({ updatedAt: new Date().toISOString(), source: 'Rijkswaterstaat Waterinfo', sourceUrl: 'https://waterinfo.rws.nl/', stations }, null, 2) + '\n')
  console.log(`${stations.length} waterstanden bijgewerkt`)
} catch (error) {
  console.warn(`Waterstanden niet vernieuwd: ${error.message}`)
  const candidates = []
  try { candidates.push(JSON.parse(await readFile(target, 'utf8'))) } catch { /* No local snapshot yet. */ }
  try {
    const response = await fetch(published, { signal: AbortSignal.timeout(15000) })
    if (response.ok) candidates.push(await response.json())
  } catch { /* Published snapshot may be unavailable. */ }
  const previous = candidates.filter(valid).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0]
  if (!previous) throw error
  await writeFile(target, JSON.stringify(previous, null, 2) + '\n')
  console.warn(`Laatste snapshot behouden (${previous.updatedAt}); meettijd blijft zichtbaar in de app.`)
}
