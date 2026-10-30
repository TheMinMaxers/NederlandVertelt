# NederlandVertelt – route integration changes

This package integrates shortest walking routes into the existing Vue + Leaflet map.

## Changed files
- `src/App.vue`: retains the existing map; stores GPS coordinates; starts/cancels route requests; draws the returned route on the existing map.
- `src/components/LocationDetail.vue`: adds a walking-route action and distance/time/error display to the existing location detail dialog.
- `src/lib/routing.js`: new OpenRouteService client and Dutch distance/time formatting.
- `src/lib/sparql.js`: removes the disconnected, duplicate map/GPS implementation. Existing SPARQL transport and coordinate parsing remain.
- `src/lib/routing.test.js`: tests request shape, coordinate order, validation, and formatting.
- `index.html`: removes the second, unused map container and duplicate global Leaflet script.
- `.github/workflows/deploy-pages.yml`: passes the Actions secret into the Vite build.
- `.env.example`, `.gitignore`, `README.md`: configuration and setup notes.

## Setup required before routes can be calculated
1. Create an OpenRouteService API key.
2. Locally, copy `.env.example` to `.env.local` and set `VITE_ORS_API_KEY=...`.
3. In GitHub repository Settings → Secrets and variables → Actions, create a repository secret named `VITE_ORS_API_KEY`.
4. Restrict the key to your website's domain in OpenRouteService. A `VITE_` variable is included in the browser bundle and is not secret after deployment. For stronger protection, route requests through a server-side proxy.

## How visitors use it
1. Press **Mijn locatie** and grant location permission.
2. Select a map marker.
3. Press **Bereken wandelroute** in the detail view.
4. Close the detail view to see the route on the existing map. The distance and estimated walking time are shown in the detail view.

## Verification
- `node --test src/lib/*.test.js`: 17 tests pass.
- JavaScript syntax checks pass for the changed Vue script blocks and routing modules.
- A full Vite production build could not be run in this environment because `npm ci` timed out. The build should be verified in GitHub Actions after adding the API secret.
