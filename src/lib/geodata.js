// Match Zeeland first, then test bridge classifications for that smaller set.
export const geodataEndpoint = 'https://query.wikidata.org/sparql?format=json'
export const geodataQuery = `PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX bd: <http://www.bigdata.com/rdf#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

SELECT ?bridge ?bridgeLabel ?coord ?town ?townLabel
       (SAMPLE(?bridgeImage) AS ?image)
       (GROUP_CONCAT(DISTINCT ?aliasNl; separator=" · ") AS ?aliasesNl) WHERE {
  {
    SELECT DISTINCT ?bridge ?coord WHERE {
      ?bridge wdt:P131+ wd:Q705 ;
              wdt:P625 ?coord .
    }
  }
  FILTER EXISTS { ?bridge wdt:P31/wdt:P279* wd:Q12280 . }
  OPTIONAL { ?bridge wdt:P276 ?town . }
  OPTIONAL { ?bridge wdt:P18 ?bridgeImage . }
  OPTIONAL {
    ?bridge skos:altLabel ?aliasNl .
    FILTER(LANG(?aliasNl) = "nl")
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "nl,en". }
}
GROUP BY ?bridge ?bridgeLabel ?coord ?town ?townLabel`
