// Application-owned data source. Change the endpoint and query here.
export const geodataEndpoint = 'https://query.wikidata.org/sparql'
export const geodataQuery = `PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX bd: <http://www.bigdata.com/rdf#>

SELECT ?item ?itemLabel ?coord WHERE {
  VALUES ?item { wd:Q727 wd:Q34370 wd:Q803 wd:Q749 }
  ?item wdt:P625 ?coord .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "nl,en". }
}
LIMIT 100`
