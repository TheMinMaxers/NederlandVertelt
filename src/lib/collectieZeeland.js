import dataset from '../data/collectie-zeeland.json' with { type: 'json' }

const value = value => ({ value })

// The catalog's objects have no coordinates. Plot their participating museums
// at verified BAG addresses, with source-provided links to collection objects.
export function collectieZeelandPoints(data = dataset) {
  return data.locations.filter(location =>
    Array.isArray(location.coordinates) && location.coordinates.length === 2 &&
    location.coordinates.every(Number.isFinite) &&
    Math.abs(location.coordinates[0]) <= 90 && Math.abs(location.coordinates[1]) <= 180,
  ).map(location => ({
    coordinates: location.coordinates,
    row: {
      item: value(location.url),
      itemLabel: value(location.name),
      lat: value(String(location.coordinates[0])),
      lon: value(String(location.coordinates[1])),
      categories: value('museum'),
      source: value('Collectie Zeeland'),
      className: value('Museum / erfgoedcollectie'),
      townLabel: value(location.town),
      address: value(location.address),
      addressSource: value(location.addressSource),
      itemDescription: value(`${location.name} is deelnemer aan Collectie Zeeland. Ontdek de collectie via de bron en de objecten hieronder. De kaart toont het gepubliceerde bezoekadres; dit is geen locatiebepaling van afzonderlijke objecten.`),
      collectionItems: location.objects,
    },
  }))
}
