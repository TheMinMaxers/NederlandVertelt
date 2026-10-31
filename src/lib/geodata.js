// Match Zeeland first, then classify locations for the map filters.
export const geodataEndpoint = 'https://query.wikidata.org/sparql?format=json'
export const geodataQuery = `PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX bd: <http://www.bigdata.com/rdf#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX schema: <http://schema.org/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?item ?itemLabel ?coord ?town ?townLabel
       (GROUP_CONCAT(DISTINCT ?classLabel; separator=", ") AS ?className)
       (MIN(?inceptionDate) AS ?inception)
       (COALESCE(SAMPLE(?descriptionNl), SAMPLE(?descriptionEn)) AS ?itemDescription)
       (GROUP_CONCAT(DISTINCT STR(?itemImage); separator="|") AS ?images)
       (GROUP_CONCAT(DISTINCT STR(?monumentNumber); separator="|") AS ?rijksmonumentnummer)
       (GROUP_CONCAT(DISTINCT ?category; separator=",") AS ?categories)
       (GROUP_CONCAT(DISTINCT ?aliasNl; separator=" · ") AS ?aliasesNl) WHERE {
  {
    SELECT DISTINCT ?item ?coord WHERE {
      ?item wdt:P131+ wd:Q705 ;
              wdt:P625 ?coord .
    }
  }
  VALUES (?category ?class) {
    ("bridge" wd:Q12280)
    ("flood-control" wd:Q2630707)
  }
  FILTER EXISTS { ?item wdt:P31/wdt:P279* ?class . }
  OPTIONAL {
    ?item wdt:P31 ?itemClass .
    OPTIONAL { ?itemClass rdfs:label ?classNl . FILTER(LANG(?classNl) = "nl") }
    OPTIONAL { ?itemClass rdfs:label ?classEn . FILTER(LANG(?classEn) = "en") }
    BIND(COALESCE(?classNl, ?classEn) AS ?classLabel)
  }
  OPTIONAL { ?item wdt:P276 ?town . }
  OPTIONAL { ?item wdt:P18 ?itemImage . }
  OPTIONAL { ?item wdt:P359 ?monumentNumber . }
  OPTIONAL { ?item wdt:P571 ?inceptionDate . }
  OPTIONAL { ?item schema:description ?descriptionNl . FILTER(LANG(?descriptionNl) = "nl") }
  OPTIONAL { ?item schema:description ?descriptionEn . FILTER(LANG(?descriptionEn) = "en") }
  OPTIONAL {
    ?item skos:altLabel ?aliasNl .
    FILTER(LANG(?aliasNl) = "nl")
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "nl,en". }
}
GROUP BY ?item ?itemLabel ?coord ?town ?townLabel`
