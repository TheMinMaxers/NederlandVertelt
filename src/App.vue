<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

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
    <div ref="mapElement" class="map" role="region" aria-label="Interactieve kaart van Nederland"></div>
    <p class="location-note">GPS gebruikt de locatievoorzieningen van je apparaat. Je browser vraagt eerst om toestemming.</p>
  </main>
</template>
