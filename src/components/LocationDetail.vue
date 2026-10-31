<script setup>
import SeaWaves from './SeaWaves.vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { locationYear } from '../lib/mapPopup'
import { imageSource, imageUrls, safeUrl, thumbnail } from '../lib/images'
import { fetchHeritage, formatRegistrationDate, monumentNumbers, preferredDescription } from '../lib/heritage'
const props = defineProps({ row: { type: Object, required: true }, categories: { type: Array, required: true } })
const emit = defineEmits(['close', 'street-view'])
const dialog = ref(null)
const carousel = ref(null)
const active = ref(0)
const failed = ref([])
const heritage = ref([])
const heritageLoading = ref(false)
const heritageError = ref(false)
const heritageController = new AbortController()
const date = computed(() => locationYear(props.row, heritage.value))
const description = computed(() => preferredDescription(props.row, heritage.value))
async function loadHeritage() {
  heritageLoading.value = true
  heritageError.value = false
  try {
    heritage.value = await fetchHeritage(props.row, { signal: heritageController.signal })
  } catch (error) {
    if (!heritageController.signal.aborted) {
      console.error('RCE details could not be loaded:', error)
      heritageError.value = true
    }
  } finally {
    heritageLoading.value = false
  }
}
const images = computed(() => imageUrls(props.row).filter(url => !failed.value.includes(url)))
const labels = computed(() => props.categories.filter(category => (props.row.categories?.value || '').split(',').includes(category.id)))
const name = computed(() => props.row.itemLabel?.value || 'Onbekende locatie')
function returnToStreetView() {
  dialog.value.close()
  emit('street-view', props.row)
}
function move(direction) {
  const element = carousel.value
  if (element) element.scrollBy({ left: direction * element.clientWidth, behavior: 'smooth' })
}
function updateSlide() {
  const element = carousel.value
  if (element?.clientWidth) active.value = Math.round(element.scrollLeft / element.clientWidth)
}
onMounted(() => {
  dialog.value.showModal()
  if (monumentNumbers(props.row).length) loadHeritage()
})
onBeforeUnmount(() => heritageController.abort())
</script>

<template>
  <dialog ref="dialog" class="detail-dialog" aria-labelledby="detail-title" @close="emit('close')">
    <header class="detail-topbar">
      <span class="brand">Nederland<span>Vertelt.</span></span>
      <nav class="detail-back-actions" aria-label="Terug naar kaart of straatbeeld">
        <button class="back-button" type="button" @click="returnToStreetView">← Terug naar Street View</button>
        <button class="back-button" type="button" autofocus @click="dialog.close()">← Terug naar de kaart <span aria-hidden="true">×</span></button>
      </nav>
      <SeaWaves />
    </header>
    <article class="detail-content">
      <div class="detail-heading">
        <p class="eyebrow">ZEELAND · EEN PLEK OM TE ONTDEKKEN</p>
        <div class="detail-tags"><span v-for="category in labels" :key="category.id" class="tag">{{ category.label }}</span></div>
        <h1 id="detail-title"><a v-if="safeUrl(row.item?.value)" :href="safeUrl(row.item.value)" target="_blank" rel="noopener noreferrer">{{ name }} <span class="external-arrow">↗</span></a><template v-else>{{ name }}</template></h1>
        <div class="detail-summary">
        <p v-if="row.className?.value" class="detail-town">{{ row.source?.value ? 'Type locatie' : 'Type bouwwerk' }}: {{ row.className.value }}</p>
        <p v-if="date" class="detail-town">{{ date.label }} {{ date.year }} · Bron: {{ date.source }}</p>
        <p v-if="row.aliasesNl?.value" class="detail-aliases">Ook bekend als: {{ row.aliasesNl.value }}</p>
        <p v-if="row.townLabel?.value || row.town?.value" class="detail-town">Stad: <a v-if="safeUrl(row.town?.value)" :href="safeUrl(row.town.value)" target="_blank" rel="noopener noreferrer">{{ row.townLabel?.value || row.town.value }} ↗</a><span v-else>{{ row.townLabel.value }}</span></p>
        <p v-if="row.address?.value" class="detail-town">Adres: {{ row.address.value }} <a v-if="safeUrl(row.addressSource?.value)" :href="safeUrl(row.addressSource.value)" target="_blank" rel="noopener noreferrer">Bron: BAG ↗</a></p>
        </div>
      </div>
      <section v-if="!row.source?.value || images.length" class="gallery" aria-label="Foto’s van de locatie">
        <div v-if="images.length" ref="carousel" class="image-carousel" tabindex="0" aria-label="Fotocarrousel, gebruik de pijltjestoetsen om te scrollen" @scroll.passive="updateSlide" @keydown.left.prevent="move(-1)" @keydown.right.prevent="move(1)">
          <figure v-for="(url, index) in images" :key="url" class="image-slide">
            <a :href="url" target="_blank" rel="noopener noreferrer" :aria-label="`Open foto ${index + 1} van ${name}`"><img :src="thumbnail(url)" :alt="`${name} — foto ${index + 1}`" :loading="index ? 'lazy' : 'eager'" @error="failed.push(url)" /></a>
          </figure>
        </div>
        <div v-else class="gallery-empty"><span aria-hidden="true">◇</span><p>Deze plek wacht nog op een foto.</p><small>Er is geen afbeelding beschikbaar op Wikidata.</small></div>
        <div class="gallery-footer">
          <p>BEELDEN VAN WIKIMEDIA COMMONS <span v-if="images.length"><a :href="imageSource(images[Math.min(active, images.length - 1)])" target="_blank" rel="noopener noreferrer">Bron, maker en licentie ↗</a></span></p>
          <div v-if="images.length" class="carousel-controls">
            <span aria-live="polite">{{ Math.min(active + 1, images.length) }} / {{ images.length }}</span>
            <button type="button" aria-label="Vorige foto" :disabled="active === 0" @click="move(-1)">←</button>
            <button type="button" aria-label="Volgende foto" :disabled="active >= images.length - 1" @click="move(1)">→</button>
          </div>
        </div>
      </section>
      <section class="heritage-section" aria-labelledby="heritage-title">
        <p class="eyebrow">{{ description?.source === 'RCE' ? 'RIJKSDIENST VOOR HET CULTUREEL ERFGOED' : (row.source?.value || 'WIKIDATA') }}</p>
        <h2 id="heritage-title">Het verhaal van deze plek</h2>
        <p v-if="description" class="heritage-description">{{ description.text }}</p>
        <p v-else-if="!heritageLoading">Er is nog geen omschrijving beschikbaar voor deze locatie.</p>
        <p v-if="heritageLoading" role="status">Erfgoedgegevens laden…</p>
        <div v-if="heritageError" role="status"><p>{{ description ? 'De aanvullende RCE-gegevens zijn tijdelijk niet beschikbaar. Je ziet de beschrijving uit Wikidata.' : 'De RCE-bron is tijdelijk niet bereikbaar. Probeer het later opnieuw of bekijk het monument bij de bron.' }}</p><button class="location-button" type="button" @click="loadHeritage">Opnieuw proberen</button> <a v-for="number in monumentNumbers(row)" :key="number" :href="`https://monumentenregister.cultureelerfgoed.nl/monumenten/${number}`" target="_blank" rel="noopener noreferrer">Monument {{ number }} bij RCE ↗</a></div>
        <article v-for="record in heritage" :key="record.rijksmonumentnummer.value" class="heritage-record">
          <dl class="heritage-facts">
            <div><dt>Rijksmonument</dt><dd><a :href="`https://monumentenregister.cultureelerfgoed.nl/monumenten/${record.rijksmonumentnummer.value}`" target="_blank" rel="noopener noreferrer">{{ record.rijksmonumentnummer.value }} ↗</a></dd></div>
            <div v-if="record.datumInschrijving?.value"><dt>Ingeschreven in het monumentenregister</dt><dd><time :datetime="record.datumInschrijving.value">{{ formatRegistrationDate(record.datumInschrijving.value) }}</time></dd></div>
            <div v-if="record.functie?.value"><dt>Oorspronkelijke functie</dt><dd>{{ record.functie.value }}</dd></div>
          </dl>
        </article>
      </section>
      <section v-if="row.source?.value" class="heritage-section" aria-labelledby="collection-title">
        <h2 id="collection-title">Ontdek de collectie</h2>
        <p>Objecten uit de selectie van de instelling. Beschikbaarheid en locatie vind je bij de bron.</p>
        <ul class="collection-links"><li v-for="item in row.collectionItems || []" :key="item.url"><a v-if="safeUrl(item.url)" :href="safeUrl(item.url)" target="_blank" rel="noopener noreferrer">{{ item.title }} ↗</a></li></ul>
        <a :href="safeUrl(row.item?.value)" target="_blank" rel="noopener noreferrer">Bekijk {{ name }} op Collectie Zeeland ↗</a>
      </section>
      <footer class="detail-bottom"><p>Elke plek heeft een verhaal.<br><strong>Ontdek het volgende op de kaart.</strong></p><button class="location-button" type="button" @click="dialog.close()">Verder ontdekken ↗</button></footer>
    </article>
  </dialog>
</template>
