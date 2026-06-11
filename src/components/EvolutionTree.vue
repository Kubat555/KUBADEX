<script setup>
import { spriteUrl } from '../lib/api'
import { dexNo } from '../lib/utils'

defineProps({
  node: { type: Object, required: true },
  currentId: Number,
})
</script>

<template>
  <div class="flex flex-wrap items-center gap-1">
    <RouterLink
      :to="`/pokemon/${node.id}`"
      class="flex w-24 flex-col items-center gap-1 rounded-xl border p-2.5 transition-all hover:-translate-y-0.5"
      :class="node.id === currentId ? 'border-dex bg-dex/10 shadow-[0_0_14px_rgba(227,53,13,0.25)]' : 'border-line bg-panel hover:border-line2'"
    >
      <img :src="spriteUrl(node.id, 'gen3')" :alt="node.label" class="pixelated size-14 object-contain" />
      <span class="font-display text-[10px] text-dim">{{ dexNo(node.id) }}</span>
      <span class="w-full truncate text-center text-xs font-semibold text-ink">{{ node.label }}</span>
    </RouterLink>

    <div v-if="node.evolvesTo.length" class="flex flex-col gap-3">
      <div v-for="evo in node.evolvesTo" :key="evo.id" class="flex items-center gap-1">
        <div class="flex w-28 flex-col items-center px-1">
          <span class="text-center text-[10px] leading-snug text-muted">{{ evo.condition || 'Special' }}</span>
          <svg viewBox="0 0 40 10" class="mt-0.5 w-10 text-dim">
            <path d="M0 5h32m0 0-6-4m6 4-6 4" stroke="currentColor" stroke-width="1.5" fill="none" />
          </svg>
        </div>
        <EvolutionTree :node="evo" :current-id="currentId" />
      </div>
    </div>
  </div>
</template>
