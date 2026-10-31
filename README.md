# ZeelandVertelt

Een kaart van bruggen, waterkeringen en musea in Zeeland, met GPS, Google
Street View en informatie uit Wikidata, RCE en Collectie Zeeland.

## Lokaal draaien

Gebruik Node 24 en installeer de afhankelijkheden:

```sh
npm ci
npm run dev
```

Voor Street View: kopieer `.env.example` naar `.env.local` en vul
`VITE_GOOGLE_MAPS_EMBED_API_KEY` in. Activeer de Maps Embed API voor deze sleutel
en beperk de HTTP-referrers tot de gebruikte localhost- en productiedomeinen.
Herstart Vite na aanpassing. Deze browsersleutel is zichtbaar in de client.

## Kaart en gegevens

De app zoekt bij het openen je GPS-locatie, na toestemming van de browser.
De locatieknop kan opnieuw zoeken. Filters tonen bruggen, waterkeringen en
musea/collecties. Iconen zijn 24 × 24 pixels; overlappende iconen worden gespreid
met subtiele verbindingslijnen (20% dekking) naar de echte locatie. Street View en navigatie
gebruiken de oorspronkelijke coördinaten.

`src/lib/geodata.js` bevat de Wikidata-SPARQL-query voor Zeeland. Alleen items
met de juiste classificatie en geldige coördinaten verschijnen op de kaart.
Klik op een icoon voor Street View; de tekstballon opent de detailpagina met
omschrijving, foto's, bronnen en beschikbare monumentgegevens.

`src/lib/heritage.js` haalt RCE-gegevens op aan de hand van Wikidata P359
(`rijksmonumentnummer`). Omschrijving, registratiedatum en oorspronkelijke
functie worden op dit nummer gekoppeld. RCE-omschrijvingen hebben voorrang;
bij ontbrekende gegevens of een storing wordt de Wikidata-beschrijving gebruikt.
Tijdelijke HTTP-fouten worden eenmaal opnieuw geprobeerd. RCE-gegevens worden
niet lokaal opgeslagen of gecachet. Sluiten van de detailpagina annuleert de aanvraag.
De registratiedatum is geen bouwdatum; bouwjaren komen uit Wikidata P571.

De museumlaag gebruikt `src/data/collectie-zeeland.json`, een compacte snapshot
van de openbare deelnemers-JSON van Collectie Zeeland. De objectcatalogus
vermeldt geen SPARQL-endpoint en bevat geen huidige objectcoördinaten.
Instellingen worden daarom op hun gepubliceerde bezoekadres geplaatst, na een
unieke BAG-match via PDOK op postcode, huisnummer en huisletter. Objectlinks
komen uit de gepubliceerde selectie van de instelling; dit betekent niet dat
alle objecten op het bezoekadres te zien zijn.

Ververs de museumgegevens met:

```sh
python3 scripts/update-collectie-zeeland.py
```

Dit vereist internet, maar geen API-key. De snapshot vermeldt bronnen,
actualisatiedatum en overgeslagen adressen. De museumlaag blijft beschikbaar
wanneer Wikidata niet bereikbaar is.

## Controleren en bouwen

```sh
node --test src/lib/*.test.js
npm run build
```

## GitHub Pages

De workflow `.github/workflows/deploy-pages.yml` bouwt en publiceert wijzigingen
op `main`. Kies **GitHub Actions** bij **Settings → Pages** en configureer de
repository-secret `VITE_GOOGLE_MAPS_EMBED_API_KEY` voor Street View.

De productie-URL is https://theminmaxers.github.io/NederlandVertelt/.
De workflow gebruikt `/NederlandVertelt/` als basispad; lokaal is dit `/`.
Controleer de Pages-build lokaal met `GITHUB_ACTIONS=true npm run build`.

## Waterstanden (Rijkswaterstaat)

Het uitklapbare paneel **Waterstanden** toont metingen van Vlissingen, Terneuzen,
Hansweert en Zierikzee. Klik op een station om in te zoomen en de meetwaarde op
de kaart te bekijken. De laag kan apart worden verborgen. Waarden zijn meters
ten opzichte van NAP, geen waterdiepte of meting bij een monument. Meetmoment,
en bron blijven zichtbaar; metingen ouder dan twee uur worden
als oud gemarkeerd.

De browser leest `public/data/water-levels.json` vanaf dezelfde site, omdat de
RWS-service geen CORS-toegang voor GitHub Pages biedt. De Pages-workflow haalt
bij iedere deployment en om het halfuur (minuten 17 en 47) nieuwe JSON op met
`node scripts/update-water-levels.mjs`. Daarvoor is geen API-key nodig. Alleen
geldige daadwerkelijke NAP-metingen worden verwerkt; voorspellingen en
ontbrekende meetwaarden worden uitgesloten. Bij storingen blijft de nieuwste
beschikbare volledige snapshot behouden, inclusief de oorspronkelijke tijden.

De app controleert om de vijf minuten op een nieuwe snapshot. GitHub Actions
kan geplande runs vertragen; dit is geen realtime waterberichtendienst.
De planning wordt actief zodra de workflow op de standaardbranch staat.
Voor lokale actualisatie: `node scripts/update-water-levels.mjs`.
