import { querySparql } from './sparql.js'

export const heritageEndpoint = 'https://api.linkeddata.cultureelerfgoed.nl/datasets/rce/cho/services/cho/sparql'

export function preferredDescription(row, records = []) {
  const descriptions = [...new Set(records.map(record => record.omschrijving?.value?.trim()).filter(Boolean))]
  if (descriptions.length) return { text: descriptions.join('\n\n'), source: 'RCE' }
  const fallback = row.itemDescription?.value?.trim()
  return fallback ? { text: fallback, source: row.source?.value || 'Wikidata' } : null
}

export function monumentNumbers(row) {
  return [...new Set((row.rijksmonumentnummer?.value || '').split('|')
    .map(number => number.trim()).filter(number => /^\d+$/.test(number)))]
}

export function heritageQuery(numbers) {
  if (!numbers.length || numbers.some(number => !/^\d+$/.test(number))) throw new Error('Invalid monument number.')
  return `PREFIX ceo: <https://linkeddata.cultureelerfgoed.nl/def/ceo#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT ?rijksmonumentnummer
       (GROUP_CONCAT(DISTINCT ?text; separator="\\n\\n") AS ?omschrijving)
       (MIN(?date) AS ?datumInschrijving)
       (GROUP_CONCAT(DISTINCT ?functionLabel; separator=", ") AS ?functie)
WHERE {
  VALUES ?rijksmonumentnummer { ${numbers.map(number => `"${number}"`).join(' ')} }
  ?monument ceo:rijksmonumentnummer ?rijksmonumentnummer .
  OPTIONAL {
    { ?monument ceo:heeftOmschrijving/ceo:omschrijving ?text . }
    UNION
    { ?monument ceo:datumInschrijvingInMonumentenregister ?date . }
    UNION
    {
      ?monument ceo:heeftOorspronkelijkeFunctie ?function .
      ?function ceo:formeelStandpunt true ; ceo:heeftFunctieNaam/skos:prefLabel ?functionLabel .
      FILTER(LANG(?functionLabel) = "nl" || LANG(?functionLabel) = "")
    }
  }
}
GROUP BY ?rijksmonumentnummer
HAVING(REGEX(GROUP_CONCAT(STR(?text); separator=""), "\\\\S"))`
}

// Left join on Wikidata P359 = RCE ceo:rijksmonumentnummer. Never join by labels.
export function joinHeritage(row, bindings) {
  const numbers = monumentNumbers(row)
  return bindings.filter(binding =>
    numbers.includes(binding.rijksmonumentnummer?.value?.trim()) &&
    Boolean(binding.omschrijving?.value?.trim()))
}

function pause(signal) {
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')) }
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve() }, 1000)
    if (signal?.aborted) abort()
    else signal?.addEventListener('abort', abort, { once: true })
  })
}

export async function fetchHeritage(row, { signal } = {}) {
  const numbers = monumentNumbers(row)
  if (!numbers.length) return []
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const data = await querySparql({ endpoint: heritageEndpoint, query: heritageQuery(numbers), signal, timeoutMs: 15000 })
      return joinHeritage(row, data.results.bindings)
    } catch (error) {
      if (signal?.aborted || attempt || ![429, 502, 503, 504].includes(error.status)) throw error
      await pause(signal)
    }
  }
}

export function formatRegistrationDate(value) {
  const match = /^(\d{4}-\d{2}-\d{2})(?:$|T|Z|[+-])/.exec(value || '')
  if (!match) return value || ''
  const date = new Date(`${match[1]}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('nl-NL', { dateStyle: 'long', timeZone: 'UTC' }).format(date)
}
