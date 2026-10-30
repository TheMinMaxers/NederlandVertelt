<script setup>
import { computed, onMounted, ref } from 'vue'
import { imageSource, imageUrls, safeUrl, thumbnail } from '../lib/images'
const props = defineProps({ row: { type: Object, required: true }, categories: { type: Array, required: true } })
const emit = defineEmits(['close'])
const dialog = ref(null)
const carousel = ref(null)
const active = ref(0)
const failed = ref([])
const images = computed(() => imageUrls(props.row).filter(url => !failed.value.includes(url)))
const labels = computed(() => props.categories.filter(category => (props.row.categories?.value || '').split(',').includes(category.id)))
const name = computed(() => props.row.itemLabel?.value || 'Onbekende locatie')
function move(direction) {
  const element = carousel.value
  if (element) element.scrollBy({ left: direction * element.clientWidth, behavior: 'smooth' })
}
function updateSlide() {
  const element = carousel.value
  if (element?.clientWidth) active.value = Math.round(element.scrollLeft / element.clientWidth)
}
onMounted(() => dialog.value.showModal())
</script>

<template>
  <dialog ref="dialog" class="detail-dialog" aria-labelledby="detail-title" @close="emit('close')">
    <header class="detail-topbar">
      <span class="brand">Nederland<span>Vertelt.</span></span>
      <button class="back-button" type="button" autofocus @click="dialog.close()">← Terug naar de kaart <span aria-hidden="true">×</span></button>
    </header>
    <article class="detail-content">
      <div class="detail-heading">
        <p class="eyebrow">ZEELAND · EEN PLEK OM TE ONTDEKKEN</p>
        <div class="detail-tags"><span v-for="category in labels" :key="category.id" class="tag">{{ category.label }}</span></div>
        <h1 id="detail-title"><a v-if="safeUrl(row.item?.value)" :href="safeUrl(row.item.value)" target="_blank" rel="noopener noreferrer">{{ name }} <span class="external-arrow">↗</span></a><template v-else>{{ name }}</template></h1>
        <p v-if="row.aliasesNl?.value" class="detail-aliases">Ook bekend als: {{ row.aliasesNl.value }}</p>
        <p v-if="row.townLabel?.value || row.town?.value" class="detail-town">Stad: <a v-if="safeUrl(row.town?.value)" :href="safeUrl(row.town.value)" target="_blank" rel="noopener noreferrer">{{ row.townLabel?.value || row.town.value }} ↗</a><span v-else>{{ row.townLabel.value }}</span></p>
      </div>
      <section class="gallery" aria-label="Foto’s van de locatie">
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
      <footer class="detail-bottom"><p>Elke plek heeft een verhaal.<br><strong>Ontdek het volgende op de kaart.</strong></p><button class="location-button" type="button" @click="dialog.close()">Verder ontdekken ↗</button></footer>
    </article>
  </dialog>
</template>
