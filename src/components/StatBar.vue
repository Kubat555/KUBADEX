<script setup>
import { ref, computed, onMounted } from 'vue'
import { statColor } from '../lib/utils'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: Number, required: true },
  max: { type: Number, default: 180 },
})

// The bar grows from zero once mounted, then follows the value: the page keeps its sections
// when it flips to the next entry, so the bar moves from the old stat to the new one.
const grown = ref(false)
onMounted(() => requestAnimationFrame(() => (grown.value = true)))
const width = computed(() => (grown.value ? Math.min(100, (props.value / props.max) * 100) : 0))
const color = computed(() => statColor(props.value))
</script>

<template>
  <div class="flex items-center gap-3">
    <span class="w-20 shrink-0 text-right text-xs font-medium text-muted">{{ label }}</span>
    <span class="num w-9 shrink-0 text-right text-sm text-ink">{{ value }}</span>
    <div class="h-2 flex-1 overflow-hidden rounded-full bg-panel2">
      <div
        class="h-full rounded-full transition-[width] duration-700 ease-out"
        :style="{ width: width + '%', background: color, boxShadow: `0 0 8px color-mix(in srgb, ${color} 40%, transparent)` }"
      ></div>
    </div>
  </div>
</template>
