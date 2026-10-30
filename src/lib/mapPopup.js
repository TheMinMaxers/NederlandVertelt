export function constructionYear(value) {
  const match = /^([+-]?\d{4,})-\d{2}-\d{2}(?:T|$)/.exec(value || '')
  return match ? String(Number(match[1])) : null
}

export function createMapPopup(row, onReadMore) {
  const popup = document.createElement('div')
  popup.className = 'intro-bubble'
  const greeting = document.createElement('p')
  const title = document.createElement('strong')
  title.textContent = row.itemLabel?.value || 'een bijzondere plek'
  const year = constructionYear(row.inception?.value)
  greeting.append('Hoi! Ik ben ', title, year ? `, gebouwd in ${year}.` : '. Mijn bouwjaar is nog onbekend.')
  const more = document.createElement('button')
  more.type = 'button'
  more.className = 'intro-read-more'
  more.textContent = 'Lees hier meer over mij!'
  more.addEventListener('click', onReadMore)
  popup.append(greeting, more)
  return popup
}
