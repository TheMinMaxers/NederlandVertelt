<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { fetchGeodata, parsePoint } from './lib/sparql'
import { calculateWalkingRoute, formatDistance, formatDuration } from './lib/routing'
import LocationDetail from './components/LocationDetail.vue'
import { imageUrls, thumbnail } from './lib/images'
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

const selectedLocation = ref(null)
const selectedLocationCoordinates = ref(null)
const currentCoordinates = ref(null)
const routeLoading = ref(false)
const routeError = ref('')
const routeSummary = ref(null)
let routeLayer
let routeController
const categoryImages = ref({})

function clearRoute() {
  routeController?.abort()
  routeController = null
  routeLayer?.remove()
  routeLayer = null
  routeSummary.value = null
  routeError.value = ''
  routeLoading.value = false
}

function openLocation(row, coordinates) {
  clearRoute()
  selectedLocation.value = row
  selectedLocationCoordinates.value = coordinates || parsePoint(row)
}

async function requestWalkingRoute() {
  if (!currentCoordinates.value) {
    routeError.value = 'Bepaal eerst je locatie met de knop ‘Mijn locatie’ op de kaart.'
    return
  }
  if (!selectedLocationCoordinates.value) {
    routeError.value = 'Voor deze locatie zijn geen geldige coördinaten beschikbaar.'
    return
  }

  routeController?.abort()
  const controller = new AbortController()
  routeController = controller
  routeLoading.value = true
  routeError.value = ''
  routeSummary.value = null

  try {
    const route = await calculateWalkingRoute({
      start: currentCoordinates.value,
      destination: selectedLocationCoordinates.value,
      signal: controller.signal,
    })
    if (routeController !== controller || !map) return

    routeLayer?.remove()
    routeLayer = L.geoJSON(route.geometry, {
      style: { color: '#2563eb', weight: 6, opacity: 0.88, lineJoin: 'round' },
    }).addTo(map)
    map.fitBounds(routeLayer.getBounds(), { padding: [48, 48], maxZoom: 16 })

    routeSummary.value = {
      distance: formatDistance(route.distance),
      duration: formatDuration(route.duration),
    }
  } catch (error) {
    if (error.name !== 'AbortError' && routeController === controller) {
      routeError.value = error.message || 'De wandelroute kon niet worden berekend.'
    }
  } finally {
    if (routeController === controller) {
      routeLoading.value = false
      routeController = null
    }
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
      .on('click', () => openLocation(row, coordinates)).bindTooltip(tooltip).addTo(nextLayer)
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
    currentCoordinates.value = [latlng.lat, latlng.lng]
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
    currentCoordinates.value = null
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
  routeController?.abort()
  routeLayer?.remove()
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
        <p class="brand">Nederland<span>Vertelt.</span></p>
        <p class="eyebrow section-kicker">DICHTBIJ. BIJZONDER. ZEELAND.</p>
        <h1>Een kaart vol <em>verhalen.</em></h1>
        <p>Van verborgen kunst tot iconische bruggen. Ontdek wat er om je heen te zien is.</p>
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
          <img v-if="categoryImages[category.id]" class="filter-category-image" :src="categoryImages[category.id]" alt="" />
          <span class="category-dot" :style="{ background: category.color }"></span>
          {{ category.label }}
        </label>
      </fieldset>
      <p v-if="!selectedCategories.length">Geen categorie geselecteerd. De kaart toont geen locaties.</p>
      <p class="location-note">Architectuur omvat gebouwen. De selectie wordt direct toegepast.</p>
      <form method="dialog"><button class="location-button" autofocus>Sluiten</button></form>
    </dialog>
    <section class="category-strip" aria-label="Ontdek per categorie">
      <button v-for="category in categories" :key="category.id" class="category-card" :class="{ 'is-selected': selectedCategories.includes(category.id) }" type="button" :aria-pressed="selectedCategories.includes(category.id)" @click="selectedCategories = selectedCategories.includes(category.id) ? selectedCategories.filter(id => id !== category.id) : [...selectedCategories, category.id]">
        <img v-if="categoryImages[category.id]" :src="categoryImages[category.id]" alt="" loading="lazy" @error="delete categoryImages[category.id]" />
        <span class="category-card-shade"></span>
        <span class="category-card-copy"><small>ONTDEK ZEELAND</small><strong>{{ category.label }}</strong></span>
        <span class="category-check" aria-hidden="true">{{ selectedCategories.includes(category.id) ? '✓' : '+' }}</span>
      </button>
    </section>
    <div class="map-heading"><div><p class="eyebrow">JOUW VOLGENDE ONTDEKKING</p><h2>Ga op verkenning</h2></div><span>Klik op een punt om het verhaal te openen ↗</span></div>
    <div ref="mapElement" class="map" role="region" aria-label="Interactieve kaart van Nederland"></div>
    <LocationDetail
      v-if="selectedLocation"
      :row="selectedLocation"
      :categories="categories"
      :has-user-location="Boolean(currentCoordinates)"
      :route-loading="routeLoading"
      :route-error="routeError"
      :route-summary="routeSummary"
      @request-route="requestWalkingRoute"
      @close="selectedLocation = null"
    />
    <p class="location-note">GPS gebruikt de locatievoorzieningen van je apparaat. Je browser vraagt eerst om toestemming.</p>
  </main>
</template>
