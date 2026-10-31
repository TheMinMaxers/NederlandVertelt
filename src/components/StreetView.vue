<script setup>
import { computed, onMounted, ref } from 'vue'
import { streetViewEmbedUrl } from '../lib/streetView'
import { createMapPopup } from '../lib/mapPopup'
const props = defineProps({ row: { type: Object, required: true }, coordinates: { type: Array, required: true } })
const emit = defineEmits(['close', 'read-more'])
const dialog = ref(null)
const bubble = ref(null)
const frameError = ref(false)
const src = computed(() => streetViewEmbedUrl(props.coordinates, import.meta.env.VITE_GOOGLE_MAPS_EMBED_API_KEY))
function readMore() { dialog.value.close(); emit('read-more', props.row) }
onMounted(() => {
  dialog.value.showModal()
  bubble.value.append(createMapPopup(props.row, readMore))
})
</script>

<template>
  <dialog ref="dialog" class="street-view-dialog" aria-label="Google Street View" @close="emit('close')">
    <div class="street-view-stage">
      <iframe v-if="src" class="street-panorama" :src="src" :title="`Google Street View bij ${row.itemLabel?.value || 'deze locatie'}`" referrerpolicy="strict-origin-when-cross-origin" allow="fullscreen" allowfullscreen @error="frameError = true"></iframe>
      <div v-if="!src || frameError" class="street-view-message" role="status">
        <div>
          <p v-if="!src">Google Street View is nog niet ingesteld. Configureer de Google Maps Embed API-sleutel om het straatbeeld te tonen.</p>
          <p v-else>Google Street View kon niet worden geladen.</p>
          <button class="location-button" type="button" @click="readMore">Bekijk de locatie-informatie</button>
        </div>
      </div>
      <button class="street-view-close" type="button" autofocus @click="dialog.close()">← Terug naar de kaart ×</button>
      <div ref="bubble" class="street-view-bubble"></div>
    </div>
  </dialog>
</template>
