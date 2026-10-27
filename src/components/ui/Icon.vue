<script setup>
// Pixel glyph from icons.js. Decorative by default (hidden from assistive tech);
// pass `label` when the icon is the only thing that carries the meaning.
import { ICONS } from './icons.js'

defineProps({
  name: { type: String, required: true, validator: (v) => Object.hasOwn(ICONS, v) },
  size: { type: Number, default: 16, validator: (v) => v === 16 || v === 32 },
  label: { type: String, default: null },
})
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 16 16"
    fill="currentColor"
    shape-rendering="crispEdges"
    class="inline-block shrink-0"
    :role="label ? 'img' : null"
    :aria-label="label"
    :aria-hidden="label ? null : 'true'"
  ><path :d="ICONS[name]" /></svg>
</template>
