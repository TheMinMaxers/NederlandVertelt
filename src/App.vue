<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { fetchGeodata } from './lib/sparql'
import { geodataEndpoint, geodataQuery } from './lib/geodata'

const loading = ref(false)
const queryStatus = ref('Geodata laden…')
const queryError = ref(false)
let dataLayer
const filterDialog = ref(null)
const selectedCategories = ref(['bridge', 'architecture', 'artwork'])
const categories = [
  { id: 'bridge', label: 'Bruggen', color: '#b45309' },
  { id: 'architecture', label: 'Architectuur', color: '#176456' },
  { id: 'artwork', label: 'Kunstwerken', color: '#7c3aed' },
]
const visibleCount = ref(0)
let loadedPoints = []
let requestController

function entityLink(label, value) {
  const text = document.createTextNode(label)
  try {
    const url = new URL(value)
    if (!['https:', 'http:'].includes(url.protocol)) return text
    const link = document.createElement('a')
    link.href = url.href
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.textContent = label
    return link
  } catch {
    return text
  }
}

async function fetchPoints() {
  if (loading.value) return
  queryError.value = false
  loading.value = true
  queryStatus.value = 'Geodata ophalen…'
  const controller = new AbortController()
  requestController = controller
  try {
    const { points, skipped } = await fetchGeodata({
      endpoint: geodataEndpoint,
      query: geodataQuery,
      signal: controller.signal,
    })
    if (!map) return
    loadedPoints = points
    renderPoints(true)
    queryStatus.value = `${points.length} locaties geladen.${skipped ? ` ${skipped} locaties zonder geldige coördinaten overgeslagen.` : ''}`
  } catch (error) {
    if (!map) return
    console.error('Could not load geodata:', error)
    queryError.value = true
    queryStatus.value = error.name === 'AbortError'
      ? 'Het laden van de locaties duurde te lang. Probeer opnieuw.'
      : `Locaties konden niet worden geladen: ${error.message}`
  } finally {
    loading.value = false
    if (requestController === controller) requestController = null
  }
}

function renderPoints(fit = false) {
  if (!map) return
  const nextLayer = L.featureGroup()
  for (const { coordinates, row } of loadedPoints) {
    const matches = (row.categories?.value || '').split(',').filter(category => selectedCategories.value.includes(category))
    if (!matches.length) continue
    const popup = document.createElement('div')
    const title = document.createElement('h2')
    title.className = 'bridge-popup-title'
    title.append(entityLink(row.itemLabel?.value || 'Locatie', row.item?.value))
    popup.append(title)
    if (row.aliasesNl?.value) {
      const aliases = document.createElement('p')
      aliases.className = 'bridge-popup-aliases'
      aliases.textContent = `Ook bekend als: ${row.aliasesNl.value}`
      popup.append(aliases)
    }
    if (row.image?.value) {
      try {
        const imageUrl = new URL(row.image.value)
        if (['http:', 'https:'].includes(imageUrl.protocol)) {
          imageUrl.protocol = 'https:'
          if (imageUrl.hostname === 'commons.wikimedia.org' && imageUrl.pathname.startsWith('/wiki/Special:FilePath/')) {
            imageUrl.searchParams.set('width', '480')
          }
          const image = document.createElement('img')
          image.className = 'bridge-popup-image'
          image.src = imageUrl.href
          image.alt = row.itemLabel?.value || 'Afbeelding van de locatie'
          image.loading = 'lazy'
          image.addEventListener('error', () => image.remove(), { once: true })
          const link = document.createElement('a')
          link.href = imageUrl.href
          link.target = '_blank'
          link.rel = 'noopener noreferrer'
          link.append(image)
          popup.append(link)
        }
      } catch {
        // A missing or invalid image must not prevent the marker from rendering.
      }
    }
    for (const [name, binding] of Object.entries(row)) {
      if (['image', 'coord', 'item', 'itemLabel', 'categories', 'town', 'townLabel', 'aliasesNl'].includes(name)) continue
      const line = document.createElement('p')
      line.textContent = `${name}: ${binding?.value ?? ''}`
      popup.append(line)
    }
    if (row.townLabel?.value || row.town?.value) {
      const town = document.createElement('p')
      town.append('Stad: ', entityLink(row.townLabel?.value || row.town.value, row.town?.value))
      popup.append(town)
    }
    L.circleMarker(coordinates, { radius: 7, color: '#fff', weight: 2, fillColor: categories.find(category => category.id === matches[0]).color, fillOpacity: 0.9 })
      .bindPopup(popup).addTo(nextLayer)
  }
  dataLayer?.remove()
  dataLayer = nextLayer.addTo(map)
  visibleCount.value = dataLayer.getLayers().length
  if (fit && visibleCount.value) map.fitBounds(dataLayer.getBounds(), { padding: [32, 32], maxZoom: 15 })
}

watch(selectedCategories, () => renderPoints())

const mapElement = ref(null)
const locating = ref(false)
const status = ref('Gebruik GPS om je locatie op de kaart te bekijken.')
const locationError = ref(false)
let map
let position
let accuracyCircle
let resizeObserver
let resizeFrame

function locate() {
  locationError.value = false
  if (!window.isSecureContext || !navigator.geolocation) {
    locationError.value = true
    status.value = 'Locatie is niet beschikbaar. Gebruik HTTPS of localhost en een browser met locatieondersteuning.'
    return
  }
  locating.value = true
  status.value = 'Je locatie wordt bepaald…'
  map.locate({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 })
}

onMounted(() => {
  map = L.map(mapElement.value).setView([52.1326, 5.2913], 7)
  resizeObserver = new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame)
    resizeFrame = requestAnimationFrame(() => map?.invalidateSize({ pan: false }))
  })
  resizeObserver.observe(mapElement.value)
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map)

  fetchPoints()

  map.on('locationfound', ({ latlng, accuracy }) => {
    locating.value = false
    if (position) {
      position.setLatLng(latlng)
      accuracyCircle.setLatLng(latlng).setRadius(accuracy)
    } else {
      accuracyCircle = L.circle(latlng, { radius: accuracy, color: '#2563eb', weight: 1, fillOpacity: 0.12 }).addTo(map)
      position = L.circleMarker(latlng, { radius: 8, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 })
        .addTo(map).bindPopup('Je bent hier')
    }
    map.fitBounds(accuracyCircle.getBounds(), { maxZoom: 16, padding: [32, 32] })
    position.openPopup()
    status.value = `Locatie gevonden · nauwkeurigheid circa ${Math.round(accuracy)} meter.`
  })
  map.on('locationerror', ({ code }) => {
    locating.value = false
    locationError.value = true
    status.value = {
      1: 'Locatietoegang geweigerd. Sta locatie toe in je browserinstellingen en probeer opnieuw.',
      2: 'Je locatie kon niet worden bepaald. Controleer of locatievoorzieningen aanstaan.',
      3: 'Het bepalen van je locatie duurde te lang. Probeer opnieuw.',
    }[code] || 'Je locatie is niet beschikbaar. Probeer opnieuw.'
  })
})

onBeforeUnmount(() => {
  requestController?.abort()
  resizeObserver?.disconnect()
  cancelAnimationFrame(resizeFrame)
  map?.stopLocate()
  map?.remove()
  map = null
})
</script>

<template>
  <main class="map-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">NederlandVertelt</p>
        <h1>Ontdek Nederland</h1>
        <p>Verken de kaart of vind je huidige locatie.</p>
      </div>
      <button class="location-button" type="button" :disabled="locating" @click="locate">
        {{ locating ? 'Locatie bepalen…' : '⌖ Mijn locatie' }}
      </button>
    </header>
    <p class="status" :class="{ error: locationError }" role="status" aria-live="polite">{{ status }}</p>
    <p class="status" :class="{ error: queryError }" role="status" aria-live="polite">{{ queryStatus }}</p>
    <button v-if="queryError" class="location-button" type="button" :disabled="loading" @click="fetchPoints">Opnieuw laden</button>
    <div class="filter-toolbar">
      <button class="location-button" type="button" @click="filterDialog.showModal()">Filters ({{ selectedCategories.length }}/3)</button>
      <span role="status">{{ visibleCount }} locaties zichtbaar</span>
    </div>
    <dialog ref="filterDialog" class="filter-dialog" aria-labelledby="filter-title" @click="event => { if (event.target === filterDialog) filterDialog.close() }">
      <h2 id="filter-title">Wat wil je zien?</h2>
      <p>Vink de categorieën aan die je op de kaart wilt zien.</p>
      <fieldset>
        <legend>Categorieën</legend>
        <label v-for="category in categories" :key="category.id" class="filter-option">
          <input v-model="selectedCategories" type="checkbox" :value="category.id" />
          <span class="category-dot" :style="{ background: category.color }"></span>
          {{ category.label }}
        </label>
      </fieldset>
      <p v-if="!selectedCategories.length">Geen categorie geselecteerd. De kaart toont geen locaties.</p>
      <p class="location-note">Architectuur omvat gebouwen. De selectie wordt direct toegepast.</p>
      <form method="dialog"><button class="location-button" autofocus>Sluiten</button></form>
    </dialog>
    <div ref="mapElement" class="map" role="region" aria-label="Interactieve kaart van Nederland"></div>
    <p class="location-note">GPS gebruikt de locatievoorzieningen van je apparaat. Je browser vraagt eerst om toestemming.</p>
  </main>
</template>
