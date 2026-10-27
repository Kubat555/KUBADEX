<script setup>
// Pixel sprite at an integer scale only: a fractional factor drops or doubles pixel rows under `pixelated`.
// `w`/`h` are the sprite's native size (gen3/frlg/shiny 64×64, icons 68×56, balls 30×30, trainers 80×80).
// `max-w-none` keeps a narrow container from shrinking it to a fractional size; plain attributes
// (e.g. `loading="eager"` for an above-the-fold sprite) fall through and override the defaults.
import { computed } from 'vue'

const props = defineProps({
  src: { type: String, required: true },
  alt: { type: String, required: true },
  w: { type: Number, default: 64 },
  h: { type: Number, default: null }, // defaults to `w` (square sprite)
  scale: { type: Number, default: 1 },
})

const factor = computed(() => Math.max(1, Math.round(props.scale) || 1))
const width = computed(() => props.w * factor.value)
const height = computed(() => (props.h ?? props.w) * factor.value)
</script>

<template>
  <img
    :src="src"
    :alt="alt"
    :width="width"
    :height="height"
    class="pixelated max-w-none shrink-0"
    loading="lazy"
    decoding="async"
  />
</template>
