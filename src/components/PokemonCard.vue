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
const shinyFailed = ref(false) // a failed shiny load is not retried: drop the layer rather than hover a broken image

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
  >
    <div class="flex items-start justify-between gap-2 text-xs text-dim">
      <span class="num">{{ dexNo(pokemon.id) }}</span>
      <span class="num">{{ t('stats.bst') }} {{ statTotal(pokemon.stats) }}</span>
    </div>

    <!-- the name below says who it is, so the sprites need no alt text of their own.
         The shiny sprite sits on top of the normal one (same silhouette) and loads with the card, so hovering shows it
         at once; screens without hover never display it, and a lazy image that is not displayed is never fetched -->
    <div class="relative mx-auto my-0.5 w-fit">
      <SpriteImg :src="spriteUrl(pokemon.id, 'gen3')" alt="" :scale="2" />
      <SpriteImg
        v-if="!shinyFailed"
        :src="spriteUrl(pokemon.id, 'shiny')"
        alt=""
        :scale="2"
        aria-hidden="true"
        class="absolute inset-0 hidden opacity-0 transition-opacity duration-(--dur-2) group-hover:opacity-100 [@media(hover:hover)]:block"
        @error="shinyFailed = true"
      />
    </div>
    <Icon
      v-if="!shinyFailed"
      name="sparkle"
      class="pointer-events-none absolute top-9 right-3 text-type-electric opacity-0 transition-opacity duration-(--dur-2) group-hover:opacity-90"
    />

    <p class="truncate text-center font-display text-base leading-tight text-ink">{{ pokemon.label }}</p>
    <div class="mt-1.5 flex justify-center gap-1">
      <TypeBadge v-for="type in pokemon.types" :key="type" :type="type" size="sm" />
    </div>
  </RouterLink>
</template>
