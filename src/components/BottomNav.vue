<script setup>
// Phone (< 640px) menu: a tab bar fixed to the bottom edge, above the home indicator (safe-area inset).
// Search opens the palette; "More" opens a bottom sheet with the rest of the menu and Settings.
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useNavLinks } from '../composables/useNavLinks'
import Icon from './ui/Icon.vue'
import Sheet from './ui/Sheet.vue'

const emit = defineEmits(['search'])

const MORE = ['moves', 'ev', 'compare', 'team', 'settings']

const { t } = useI18n()
const { to, section } = useNavLinks()
const moreOpen = ref(false)
const inMore = computed(() => MORE.includes(section.value))

// leaving the page another way (Back, a link elsewhere) closes "More" too, as it does the search palette;
// a query-only change (a filter or search text written to the URL) is not leaving it
const route = useRoute()
watch(() => route.path, () => (moreOpen.value = false))

const tab = 'relative flex h-14 w-full flex-col items-center justify-center gap-1 text-xs font-medium transition-colors duration-(--dur-1)'
const tone = (on) => (on ? 'text-ink' : 'text-muted hover:text-ink')
</script>

<template>
  <nav
    :aria-label="t('nav.main')"
    class="fixed inset-x-0 bottom-0 z-40 border-t border-line-strong bg-surface-1/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden"
  >
    <ul class="grid grid-cols-5">
      <li>
        <RouterLink :to="to.pokedex" :class="[tab, tone(section === 'pokedex')]">
          <span v-if="section === 'pokedex'" aria-hidden="true" class="absolute inset-x-4 top-0 h-0.5 bg-dexglow" />
          <Icon name="list" />{{ t('nav.pokedex') }}
        </RouterLink>
      </li>
      <li>
        <RouterLink :to="to.map" :class="[tab, tone(section === 'map')]">
          <span v-if="section === 'map'" aria-hidden="true" class="absolute inset-x-4 top-0 h-0.5 bg-dexglow" />
          <Icon name="map" />{{ t('nav.map') }}
        </RouterLink>
      </li>
      <li>
        <button type="button" aria-haspopup="dialog" :class="[tab, tone(false)]" @click="emit('search')">
          <Icon name="search" />{{ t('common.search') }}
        </button>
      </li>
      <li>
        <RouterLink :to="to.bosses" :class="[tab, tone(section === 'bosses')]">
          <span v-if="section === 'bosses'" aria-hidden="true" class="absolute inset-x-4 top-0 h-0.5 bg-dexglow" />
          <Icon name="swords" />{{ t('nav.bosses') }}
        </RouterLink>
      </li>
      <li>
        <button
          type="button"
          aria-haspopup="dialog"
          :aria-expanded="moreOpen"
          :class="[tab, tone(inMore)]"
          @click="moreOpen = true"
        >
          <span v-if="inMore" aria-hidden="true" class="absolute inset-x-4 top-0 h-0.5 bg-dexglow" />
          <Icon name="more" />{{ t('nav.more') }}
        </button>
      </li>
    </ul>

    <Sheet :open="moreOpen" :title="t('nav.more')" :close-label="t('common.close')" @close="moreOpen = false">
      <ul class="flex flex-col gap-1 pb-2">
        <li v-for="name in MORE" :key="name">
          <RouterLink
            :to="to[name]"
            class="flex h-12 items-center justify-between gap-3 rounded-lg px-3 font-display text-base uppercase transition-colors duration-(--dur-1)"
            :class="section === name ? 'bg-surface-2 text-ink' : 'text-muted hover:text-ink'"
            @click="moreOpen = false"
          >
            {{ t(`nav.${name}`) }}
            <Icon name="arrow-right" :class="section === name ? 'text-dexglow' : 'text-faint'" />
          </RouterLink>
        </li>
      </ul>
    </Sheet>
  </nav>
</template>
