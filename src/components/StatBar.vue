<script setup>
import { ref, onMounted } from 'vue'
import { statColor } from '../lib/utils'

const props = defineProps({
  label: String,
  value: Number,
  max: { type: Number, default: 180 },
})

const width = ref(0)
onMounted(() => requestAnimationFrame(() => (width.value = Math.min(100, (props.value / props.max) * 100))))
</script>

<template>
  <div class="flex items-center gap-3">
    <span class="w-16 shrink-0 text-right text-xs font-medium text-muted">{{ label }}</span>
    <span class="w-9 shrink-0 text-right font-display text-sm tabular-nums text-ink">{{ value }}</span>
    <div class="h-2 flex-1 overflow-hidden rounded-full bg-panel2">
      <div
        class="h-full rounded-full transition-[width] duration-700 ease-out"
        :style="{ width: width + '%', background: statColor(value), boxShadow: `0 0 8px ${statColor(value)}66` }"
      ></div>
    </div>
  </div>
</template>
