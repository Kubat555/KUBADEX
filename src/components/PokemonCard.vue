<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { spriteUrl } from '../lib/api'
import { dexNo, statTotal } from '../lib/utils'
import TypeBadge from './TypeBadge.vue'
import Icon from './ui/Icon.vue'
import SpriteImg from './ui/SpriteImg.vue'

const props = defineProps({
  pokemon: { type: Object, required: true },
  /** game the list is filtered by — the entry opens in that game */
  game: { type: String, default: null },
})

const { t } = useI18n()
const t0 = computed(() => props.pokemon.types[0])
const shiny = ref(false) // the shiny sprite while hovered

// the first type's colour tints the border on hover
const cardStyle = computed(() => ({
  '--t': `color-mix(in srgb, var(--color-type-${t0.value}) 55%, var(--color-line))`,
}))
</script>

<template>
  <RouterLink
    :to="{ name: 'pokemon', params: { id: pokemon.id }, query: game ? { game } : {} }"
    class="group relative block overflow-hidden rounded-xl border border-line bg-surface-1 p-3 transition-[translate,border-color,box-shadow] duration-(--dur-2) ease-out hover:-translate-y-1 hover:border-(--t) hover:shadow-lg hover:shadow-black/40"
    :style="cardStyle"
    @mouseenter="shiny = true"
    @mouseleave="shiny = false"
  >
    <div class="flex items-start justify-between gap-2 text-xs text-dim">
      <span class="num">{{ dexNo(pokemon.id) }}</span>
      <span class="num">{{ t('stats.bst') }} {{ statTotal(pokemon.stats) }}</span>
    </div>

    <!-- the name below says who it is, so the sprite needs no alt text of its own -->
    <SpriteImg :src="spriteUrl(pokemon.id, shiny ? 'shiny' : 'gen3')" alt="" :scale="2" class="mx-auto my-0.5" />
    <Icon
      name="sparkle"
      class="pointer-events-none absolute top-9 right-3 text-type-electric transition-opacity duration-(--dur-2)"
      :class="shiny ? 'opacity-90' : 'opacity-0'"
    />

    <p class="truncate text-center font-display text-base leading-tight text-ink">{{ pokemon.label }}</p>
    <div class="mt-1.5 flex justify-center gap-1">
      <TypeBadge v-for="type in pokemon.types" :key="type" :type="type" size="sm" />
    </div>
  </RouterLink>
</template>
