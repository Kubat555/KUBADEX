<script setup>
// Placeholder block while data loads. Numbers are px, strings any CSS length ('100%', '3rem').
// Decorative (aria-hidden): the loading container should carry `aria-busy` instead.
// The pulse stops under reduced motion via the global rule in main.css (OS setting or "Motion: less").
import { computed } from 'vue'

const props = defineProps({
  w: { type: [Number, String], default: '100%' },
  h: { type: [Number, String], default: 16 },
  rounded: { type: [Number, String], default: 4 },
})

const css = (v) => (typeof v === 'number' ? `${v}px` : v)
const style = computed(() => ({ width: css(props.w), height: css(props.h), borderRadius: css(props.rounded) }))
</script>

<template>
  <span aria-hidden="true" class="block animate-pulse bg-line" :style="style" />
</template>
