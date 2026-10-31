export const waterEndpoint = 'https://ddapi20-waterwebservices.rijkswaterstaat.nl/ONLINEWAARNEMINGENSERVICES/OphalenLaatsteWaarnemingen'
export const waterStationCodes = ['vlissingen', 'terneuzen', 'hansweert', 'zierikzee']

// A response can contain older checked series alongside recent unchecked ones.
// Select the newest actual NAP measurement, never forecasts or missing values.
export function parseWaterLevels(data, now = Date.now()) {
  if (data?.Succesvol !== true || !Array.isArray(data.WaarnemingenLijst)) throw new Error('Ongeldig RWS-antwoord')
  const stations = new Map()
  for (const series of data.WaarnemingenLijst) {
    const meta = series.AquoMetadata, site = series.Locatie
    if (meta?.Grootheid?.Code !== 'WATHTE' || meta?.Hoedanigheid?.Code !== 'NAP' || meta?.ProcesType !== 'meting' || !waterStationCodes.includes(site?.Code)) continue
    if (!['cm', 'm'].includes(meta.Eenheid?.Code) || !Number.isFinite(site.Lat) || !Number.isFinite(site.Lon) || Math.abs(site.Lat) > 90 || Math.abs(site.Lon) > 180) continue
    for (const reading of series.MetingenLijst || []) {
      const value = reading.Meetwaarde?.Waarde_Numeriek
      const time = Date.parse(reading.Tijdstip)
      const quality = reading.WaarnemingMetadata?.Kwaliteitswaardecode
      if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) >= 9999 || !Number.isFinite(time) || time > now || String(quality) !== '00') continue
      if (time <= Date.parse(stations.get(site.Code)?.measuredAt || '1900-01-01')) continue
      stations.set(site.Code, { code: site.Code, name: site.Naam || site.Code, coordinates: [site.Lat, site.Lon], metersNAP: meta.Eenheid.Code === 'cm' ? value / 100 : value, measuredAt: reading.Tijdstip, status: reading.WaarnemingMetadata?.Statuswaarde || '' })
    }
  }
  return [...stations.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export function waterHeight(value) {
  return `${value > 0 ? '+' : ''}${new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} m NAP`
}
export function waterTime(value) {
  return new Intl.DateTimeFormat('nl-NL', { timeZone: 'Europe/Amsterdam', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}
export function isOldWaterReading(value, now = Date.now()) {
  return !Number.isFinite(Date.parse(value)) || now - Date.parse(value) > 2 * 60 * 60 * 1000
}
