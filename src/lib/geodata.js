// Match Zeeland first, then test bridge classifications for that smaller set.
export const geodataEndpoint = 'https://query.wikidata.org/sparql?format=json'
export const geodataQuery = `PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX bd: <http://www.bigdata.com/rdf#>

SELECT DISTINCT ?bridge ?bridgeLabel ?coord ?town ?townLabel WHERE {
  {
    SELECT DISTINCT ?bridge ?coord WHERE {
      ?bridge wdt:P131+ wd:Q705 ;
              wdt:P625 ?coord .
    }
  }
  FILTER EXISTS { ?bridge wdt:P31/wdt:P279* wd:Q12280 . }
  OPTIONAL { ?bridge wdt:P276 ?town . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "nl,en". }
}`
