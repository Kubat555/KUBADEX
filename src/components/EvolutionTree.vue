<script setup>
import { useI18n } from 'vue-i18n'
import { spriteUrl } from '../lib/api'
import { dexNo } from '../lib/utils'
import SpriteImg from './ui/SpriteImg.vue'

defineProps({
  node: { type: Object, required: true },
  currentId: Number,
})

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-wrap items-center gap-1">
    <RouterLink
      v-if="node.id"
      :to="`/pokemon/${node.id}`"
      :aria-current="node.id === currentId ? 'page' : null"
      class="flex w-28 flex-col items-center gap-1 rounded-xl border p-2.5 transition-[translate,border-color] duration-(--dur-1) hover:-translate-y-0.5"
      :class="node.id === currentId ? 'border-dex bg-dex/10 shadow-[0_0_14px_rgba(227,53,13,0.25)]' : 'border-line bg-panel hover:border-line2'"
    >
      <SpriteImg :src="spriteUrl(node.id, 'gen3')" alt="" :w="64" />
      <span class="num text-[11px] text-dim">{{ dexNo(node.id) }}</span>
      <span class="w-full text-center text-xs font-semibold leading-snug text-ink text-balance break-words">{{ node.label }}</span>
    </RouterLink>
    <!-- a stage from a later generation (e.g. Munchlax) has no entry in this dex: a plain card, no link or sprite -->
    <div v-else class="flex w-28 flex-col items-center gap-1 rounded-xl border border-dashed border-line p-2.5">
      <span class="grid size-16 place-items-center font-display text-2xl text-dim" aria-hidden="true">?</span>
      <span class="text-center text-[11px] leading-snug text-dim text-balance">{{ t('pokemon.evolution.notInDex') }}</span>
      <span class="w-full text-center text-xs font-semibold leading-snug text-ink text-balance break-words">{{ node.label }}</span>
    </div>

    <div v-if="node.evolvesTo.length" class="flex flex-col gap-3">
      <div v-for="evo in node.evolvesTo" :key="evo.id ?? evo.name" class="flex items-center gap-1">
        <div class="flex w-28 flex-col items-center px-1">
          <span class="text-center text-xs leading-snug text-muted text-balance">{{ evo.condition || t('pokemon.evolution.special') }}</span>
          <svg viewBox="0 0 40 10" class="mt-0.5 w-10 text-dim" aria-hidden="true">
            <path d="M0 5h32m0 0-6-4m6 4-6 4" stroke="currentColor" stroke-width="1.5" fill="none" />
          </svg>
        </div>
        <EvolutionTree :node="evo" :current-id="currentId" />
      </div>
    </div>
  </div>
</template>
