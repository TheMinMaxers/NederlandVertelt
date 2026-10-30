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
