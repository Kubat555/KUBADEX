<script setup>
import { computed } from 'vue'
import { spriteUrl } from '../lib/api'
import { dexNo, statTotal } from '../lib/utils'
import TypeBadge from './TypeBadge.vue'

const props = defineProps({ pokemon: { type: Object, required: true } })
const t0 = computed(() => props.pokemon.types[0])
</script>

<template>
  <RouterLink
    :to="`/pokemon/${pokemon.id}`"
    class="group relative block overflow-hidden rounded-xl border border-line bg-panel p-3 transition-all duration-200 hover:-translate-y-1 hover:border-(--t) hover:shadow-lg hover:shadow-black/40"
    :style="{ '--t': `color-mix(in srgb, var(--color-type-${t0}) 55%, var(--color-line))` }"
  >
    <!-- type glow backdrop -->
    <div
      class="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full opacity-[0.13] blur-2xl transition-opacity duration-300 group-hover:opacity-30"
      :style="{ background: `var(--color-type-${t0})` }"
    ></div>

    <div class="flex items-start justify-between">
      <span class="font-display text-xs text-dim">{{ dexNo(pokemon.id) }}</span>
      <span class="font-display text-[10px] tracking-wider text-dim">BST {{ statTotal(pokemon.stats) }}</span>
    </div>

    <img
      :src="spriteUrl(pokemon.id, 'gen3')"
      :alt="pokemon.label"
      loading="lazy"
      class="pixelated mx-auto my-1 size-16 object-contain transition-transform duration-200 group-hover:scale-110"
    />

    <p class="truncate text-center text-sm font-semibold text-ink">{{ pokemon.label }}</p>
    <div class="mt-1.5 flex justify-center gap-1">
      <TypeBadge v-for="t in pokemon.types" :key="t" :type="t" size="sm" />
    </div>
  </RouterLink>
</template>
