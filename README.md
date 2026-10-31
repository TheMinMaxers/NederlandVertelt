# NederlandVertelt

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Application SPARQL data

The map loads geodata automatically on mount. Configure the application's
endpoint and SELECT query in `src/lib/geodata.js`; the configured query loads bridges in Zeeland from Wikidata, including bridge
subclasses and locations nested under Zeeland through administrative areas.
The query resolves Zeeland locations in a subquery before testing bridge
classifications to avoid expensive global bridge traversal.
There is no result limit. Only bridges with coordinates and the relevant
classification/location statements in Wikidata can be shown; this is not a
complete inventory of every physical bridge. There is no query editor in the interface.

`src/lib/sparql.js` exports `querySparql({ endpoint, query, signal, timeoutMs })`
for raw SELECT results and `fetchGeodata(...)` for map-ready points plus a
skipped-row count. Both support cancellation and a 30-second default timeout.
The endpoint must allow cross-origin browser requests (CORS).

Coordinates must be WGS84 decimal degrees in `?lat` / `?lon` (also
`?latitude`, `?longitude`, `?lng`), or WKT `POINT(longitude latitude)` in
`?coord`, `?location`, or `?wkt`. Other fields appear as plain text in popups.
Invalid coordinates are skipped. GPS remains a separate map layer.
Use `LIMIT` to keep queries manageable.

Run checks with `node --test src/lib/sparql.test.js` and `npm run build`.

### GitHub Pages

`.github/workflows/deploy-pages.yml` builds and deploys pushes to `main`.
In repository **Settings → Pages → Build and deployment**, choose **GitHub Actions**.
Merge the application and workflow into `main`, then check the **Actions** tab.
The workflow can also be started manually with **Run workflow**.

Expected URL after successful deployment:
https://theminmaxers.github.io/NederlandVertelt/

The workflow uses Node 24 and builds assets with `/NederlandVertelt/` as the
base path. Local development continues to use `/`. To verify the Pages build
locally, run `GITHUB_ACTIONS=true npm run build`.

### Map filters

The **Filters** button opens a dialog with checkboxes for bridges, architecture
(buildings and their subclasses), and artworks in Zeeland. All start selected.
Filters apply immediately to loaded points without another network request;
GPS remains visible independently. Items matching multiple categories stay
visible when any matching category is selected. Data coverage depends on
Wikidata classification, administrative-location and coordinate statements.

### Location detail view

Click a map marker to open Google Street View; the overlay links to its full-page detail view. Close it with the return
button or Escape; the map position and filters are preserved. All available
P18 photos are returned by the query and displayed in a horizontally scrolling
carousel with arrow buttons and keyboard navigation. A source link opens the
Commons file page for attribution. Locations without photos show an empty state.
Category cards use photos from the loaded Wikidata results and toggle filters.

Run all checks with `node --test src/lib/*.test.js` and `npm run build`.

### RCE enrichment

Wikidata's optional P359 identifiers are returned as `rijksmonumentnummer`.
When a location detail view opens, `src/lib/heritage.js` queries the RCE CHO
SPARQL endpoint for those exact identifiers and joins the returned bindings by
`ceo:rijksmonumentnummer`. This is an application-level left join across two
endpoints; there is no SQL-style `JOIN` keyword or remote `SERVICE` dependency.
Locations without P359 remain on the map, and RCE errors do not block Wikidata.
Successful responses are cached for the session; closing details cancels a
pending request. Multiple monument numbers are shown as separate registrations.

The detail view displays the RCE `omschrijving`, `datumInschrijving` (the date of
registration in the monument register, not construction), original function
when available, and a link to the register. Descriptions render as plain text.

Live verification: station Nisse (509157) matched across both endpoints and
returned a description, registration date 1998-02-11, and function Tramstation.

The Wikidata query keeps its efficient VALUES-based classification. The RCE
query uses `UNION` for the
optional description, registration date and function rows, then groups these
back into a single registration. Cross-source matching still uses monument
numbers in the application: Wikidata rejects the RCE endpoint as a federated
`SERVICE` ("Service URI ... is not allowed"). Unioning unjoined rows from the
two sources would not attach descriptions to map locations.

Descriptions prefer non-empty RCE `omschrijving` text. If no RCE description is
returned, or the RCE request fails, the detail view displays Wikidata's Dutch
`schema:description`, falling back to English. The displayed source follows the
selected description. If neither source has text, an empty-state message appears.

### Map-first interface

The map fills the viewport below a compact grey title bar. Filters open in an
80vw × 80dvh dialog with category photo cards and the GPS control. Clicking a
marker opens Google Street View directly, with an introduction bubble layered
on top; **Lees hier meer over mij!** opens the full location page. The construction year comes from Wikidata P571 (inception), not
RCE's monument registration date. Missing construction dates are shown as unknown.

### Google Street View in de app

Klik op een kaartpunt om direct Google Street View binnen de app te openen.
Er verschijnt geen voorafgaande kaartpop-up. De locatieballon staat boven het
straatbeeld; **Lees hier meer over mij!** opent de detailpagina. Sluiten of
Escape brengt je terug naar de kaart.

Kopieer `.env.example` naar `.env.local`, vul `VITE_GOOGLE_MAPS_EMBED_API_KEY`
in en herstart `npm run dev`. Activeer de **Maps Embed API** voor deze sleutel
in Google Cloud. Sta de gebruikte localhost-origin en het productiedomein toe
bij de HTTP-referrerbeperkingen. De sleutel is zichtbaar in de browser.
Voor GitHub Actions wordt de gelijknamige repository-secret gebruikt.

Zonder sleutel toont de app een configuratiemelding en blijft de
locatie-informatie beschikbaar. De beschikbaarheid van opnames wordt door
Google bepaald. Documentatie: https://developers.google.com/maps/documentation/embed/embedding-map
