<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { isOldWaterReading, waterHeight, waterTime } from '../lib/waterLevels'
const emit = defineEmits(['loaded', 'select', 'toggle'])
const stations = ref([])
const loading = ref(false)
const error = ref(false)
const visible = ref(true)
const now = ref(Date.now())
const controller = new AbortController()
let timer
async function load() {
  if (loading.value) return
  loading.value = true
  error.value = false
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/water-levels.json`, { cache: 'no-cache', signal: controller.signal })
    if (!response.ok) throw new Error('Waterstanden niet beschikbaar')
    const data = await response.json()
    if (!Array.isArray(data.stations) || !data.stations.length || data.stations.some(s => !Number.isFinite(s.metersNAP) || !Number.isFinite(Date.parse(s.measuredAt)) || !Array.isArray(s.coordinates) || s.coordinates.length !== 2 || !s.coordinates.every(Number.isFinite))) throw new Error('Ongeldige waterstanden')
    stations.value = data.stations
    emit('loaded', data.stations)
  } catch {
    if (!controller.signal.aborted) error.value = true
  } finally { loading.value = false; now.value = Date.now() }
}
onMounted(() => { load(); timer = setInterval(load, 5 * 60 * 1000) })
onBeforeUnmount(() => { controller.abort(); clearInterval(timer) })
</script>

<template>
  <details class="water-panel">
    <summary><span aria-hidden="true">≈</span> Waterstanden <span class="water-panel-arrow" aria-hidden="true">⌄</span></summary>
    <div class="water-panel-content">
      <p class="water-caption">Gemeten bij RWS-meetstations · t.o.v. NAP</p>
      <p v-if="loading && !stations.length" role="status">Waterstanden laden…</p>
      <p v-if="error" role="status">Vernieuwen niet gelukt. {{ stations.length ? 'De eerdere metingen blijven zichtbaar.' : 'Probeer het later opnieuw.' }}</p>
      <label v-if="stations.length" class="water-toggle"><input v-model="visible" type="checkbox" @change="emit('toggle', visible)" /> Meetstations op de kaart</label>
      <ul class="water-stations">
        <li v-for="station in stations" :key="station.code">
          <button type="button" @click="visible = true; emit('select', station)"><span>{{ station.name }} <small>{{ waterTime(station.measuredAt) }}</small></span><strong>{{ waterHeight(station.metersNAP) }}</strong></button>
          <small v-if="isOldWaterReading(station.measuredAt, now)" class="water-old">Oudere meting · meer dan 2 uur geleden</small>
        </li>
      </ul>
      <div class="water-panel-footer"><a href="https://waterinfo.rws.nl/" target="_blank" rel="noopener noreferrer">Bron: Rijkswaterstaat ↗</a><button type="button" :disabled="loading" @click="load">{{ loading ? 'Laden…' : 'Vernieuwen' }}</button></div>
      <p class="water-caption">Periodiek bijgewerkt, ongeveer elke 30 minuten. Een meetwaarde geldt voor het station, niet voor een nabijgelegen monument.</p>
    </div>
  </details>
</template>

<style scoped>
.water-panel { position: absolute; top: 1rem; right: 1rem; z-index: 500; width: min(300px, calc(100% - 5rem)); color: var(--theme-ink); background: var(--theme-paper); border: 1px solid var(--theme-line); border-radius: 1rem; box-shadow: 0 4px 20px #173f3e22; }
summary { display: flex; align-items: center; gap: .7rem; padding: .8rem 1rem; cursor: pointer; font-weight: 600; font-size: .85rem; list-style: none; }
summary::-webkit-details-marker { display: none; }
summary > span:first-child { color: var(--theme-water); font-size: 1.6rem; line-height: 1; }
.water-panel-arrow { margin-left: auto; }
[open] .water-panel-arrow { transform: rotate(180deg); }
.water-panel-content { padding: 0 1rem 1rem; max-height: min(60dvh, 460px); overflow-y: auto; }
.water-caption { font-size: .65rem; line-height: 1.6; color: var(--theme-muted); }
.water-toggle { display: flex; gap: .5rem; align-items: center; font-size: .75rem; margin: .75rem 0; }
.water-toggle input { accent-color: var(--theme-water); }
.water-stations { list-style: none; padding: 0; margin: .5rem 0; }
.water-stations li { padding: .6rem 0; border-bottom: 1px solid var(--theme-line); }
.water-stations button { display: flex; align-items: center; justify-content: space-between; gap: .5rem; width: 100%; border: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; font: inherit; font-size: .8rem; }
.water-stations button:hover { color: var(--theme-rust); }
.water-stations strong { white-space: nowrap; font-weight: 700; font-size: .8rem; }
.water-stations small { display: block; font-size: .65rem; color: var(--theme-muted); }
.water-stations .water-old { color: #93451e; }
.water-panel-footer { display: flex; justify-content: space-between; gap: .5rem; margin: .75rem 0; font-size: .65rem; }
a, .water-panel-footer button { color: var(--theme-ink); }
.water-panel-footer button { border: 0; background: transparent; font: inherit; text-decoration: underline; cursor: pointer; }
</style>
