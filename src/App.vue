<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { fetchGeodata, parsePoint } from './lib/sparql'
import StreetView from './components/StreetView.vue'
import LocationDetail from './components/LocationDetail.vue'
import { imageUrls, thumbnail } from './lib/images'
import { geodataEndpoint, geodataQuery } from './lib/geodata'

const loading = ref(false)
const queryStatus = ref('Geodata laden…')
const queryError = ref(false)
let dataLayer
const filterDialog = ref(null)
const selectedCategories = ref(['bridge', 'flood-control'])
const categories = [
  { id: 'bridge', label: 'Bruggen', color: '#b45309' },
  { id: 'flood-control', label: 'Waterkeringen', color: '#0369a1' },
]
const visibleCount = ref(0)
let loadedPoints = []
let requestController

const selectedLocation = ref(null)
const streetLocation = ref(null)
const categoryImages = ref({})

function openLocation(row) {
  selectedLocation.value = row
}

function returnToStreetView(row) {
  const coordinates = parsePoint(row)
  if (coordinates) streetLocation.value = { row, coordinates }
  selectedLocation.value = null
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
      timeoutMs: 60000,
    })
    if (!map) return
    loadedPoints = points
    for (const category of categories) {
      const point = points.find(({ row }) => (row.categories?.value || '').split(',').includes(category.id) && imageUrls(row).length)
      if (point) categoryImages.value[category.id] = thumbnail(imageUrls(point.row)[0], 600)
    }
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
    const tooltip = document.createElement('span')
    tooltip.textContent = row.itemLabel?.value || 'Locatie'
    L.circleMarker(coordinates, { radius: 7, color: '#fff', weight: 2, fillColor: categories.find(category => category.id === matches[0]).color, fillOpacity: 0.9 })
      .on('click', () => { streetLocation.value = { row, coordinates } })
      .bindTooltip(tooltip).addTo(nextLayer)
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
  <main class="map-page map-experience">
    <header class="page-header map-topbar">
      <div class="map-topbar-copy">
        <h1 class="brand">Nederland<span>Vertelt.</span></h1>
        <p>Ontdek de bruggen en waterkeringen van Zeeland. Klik op een punt en laat de plek vertellen.</p>
        <p v-if="loading || queryError" class="status" :class="{ error: queryError }" role="status">{{ queryStatus }} <button v-if="queryError" class="intro-read-more" type="button" @click="fetchPoints">Opnieuw laden</button></p>
      </div>
      <button class="location-button" type="button" aria-haspopup="dialog" @click="filterDialog.showModal()">☷ Filters <span class="filter-count">{{ selectedCategories.length }}</span></button>
    </header>
    <dialog ref="filterDialog" class="filter-dialog map-filter-dialog" aria-labelledby="filter-title" @click="event => { if (event.target === filterDialog) filterDialog.close() }">
      <div class="filter-dialog-heading">
        <div><p class="eyebrow">MAAK DE KAART VAN JOU</p><h2 id="filter-title">Wat wil je ontdekken?</h2></div>
        <button class="back-button" type="button" autofocus aria-label="Filters sluiten" @click="filterDialog.close()">Sluiten ×</button>
      </div>
      <p>Kies één of meer categorieën. Je selectie wordt direct toegepast.</p>
      <fieldset class="filter-card-grid">
        <legend class="visually-hidden">Categorieën</legend>
        <label v-for="category in categories" :key="category.id" class="category-card filter-image-card" :class="{ 'is-selected': selectedCategories.includes(category.id) }">
          <img v-if="categoryImages[category.id]" :src="categoryImages[category.id]" alt="" loading="lazy" @error="delete categoryImages[category.id]" />
          <span class="category-card-shade"></span>
          <span class="category-card-copy"><small>ONTDEK ZEELAND</small><strong>{{ category.label }}</strong></span>
          <input v-model="selectedCategories" type="checkbox" :value="category.id" :aria-label="category.label" />
        </label>
      </fieldset>
      <p v-if="!selectedCategories.length" role="status">Vink een categorie aan om locaties op de kaart te zien.</p>
      <p v-else role="status">{{ visibleCount }} locaties zichtbaar</p>
      <form method="dialog" class="filter-apply"><button class="location-button">Toon de kaart ↗</button></form>
    </dialog>
    <div class="map-stage">
      <div ref="mapElement" class="map" role="region" aria-label="Interactieve kaart van Zeeland"></div>
      <div class="map-location-control">
        <p :class="{ 'visually-hidden': !locating && !locationError, error: locationError }" role="status">{{ status }}</p>
        <button class="map-location-button" type="button" :disabled="locating" :aria-busy="locating" :title="locating ? 'Locatie bepalen…' : 'Vind mijn locatie'" @click="locate">
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="7" />
            <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
            <path d="M12 2v3m0 14v3M2 12h3m14 0h3" />
          </svg>
          <span>{{ locating ? 'Locatie bepalen…' : 'Vind mijn locatie' }}</span>
        </button>
      </div>
    </div>
    <StreetView v-if="streetLocation" :row="streetLocation.row" :coordinates="streetLocation.coordinates" @close="streetLocation = null" @read-more="openLocation" />
    <LocationDetail v-if="selectedLocation" :row="selectedLocation" :categories="categories" @close="selectedLocation = null" @street-view="returnToStreetView" />
  </main>
</template>
