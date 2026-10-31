export function constructionYear(value) {
  const match = /^([+-]?\d{4,})-\d{2}-\d{2}(?:T|$)/.exec(value || '')
  return match ? String(Number(match[1])) : null
}

// Keep opening dates and monument registration dates distinct from construction.
export function locationYear(row, records = []) {
  const registration = records.find(record => constructionYear(record.datumInschrijving?.value))
  if (registration) return { year: constructionYear(registration.datumInschrijving.value), label: 'Ingeschreven als rijksmonument in', source: 'RCE' }
  const inception = constructionYear(row.inception?.value)
  if (inception) return { year: inception, label: 'Gebouwd in', source: 'Wikidata' }
  const opening = constructionYear(row.officialOpening?.value)
  return opening ? { year: opening, label: 'Geopend in', source: 'Wikidata' } : null
}

export function createMapPopup(row, onReadMore) {
  const popup = document.createElement('div')
  popup.className = 'intro-bubble'
  const greeting = document.createElement('p')
  const title = document.createElement('strong')
  title.textContent = row.itemLabel?.value || 'een bijzondere plek'
  const date = locationYear(row)
  greeting.append('Hoi! Ik ben ', title, row.source?.value === 'Collectie Zeeland' ? '. Ontdek mijn collectie!' : date ? `, ${date.label.toLowerCase()} ${date.year}.` : '. Mijn bouwjaar is nog onbekend.')
  const more = document.createElement('button')
  more.type = 'button'
  more.className = 'intro-read-more'
  more.textContent = 'Lees hier meer over mij!'
  more.addEventListener('click', onReadMore)
  popup.append(greeting, more)
  return popup
}
