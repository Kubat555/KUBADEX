<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { loadByLocation, spriteUrl } from '../lib/api'
import { GAMES, GAME_ORDER, METHOD_ICON_NAMES } from '../data/games'
import { cap, dexNo } from '../lib/utils'
import { useQueryState } from '../composables/useQueryState'
import { usePrefsStore } from '../stores/prefs'
import kantoMap from '../data/maps/kanto.json'
import hoennMap from '../data/maps/hoenn.json'
import RegionMap from '../components/RegionMap.vue'
import PageHeader from '../components/ui/PageHeader.vue'
import Segmented from '../components/ui/Segmented.vue'
import Chip from '../components/ui/Chip.vue'
import Sheet from '../components/ui/Sheet.vue'
import Skeleton from '../components/ui/Skeleton.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import SpriteImg from '../components/ui/SpriteImg.vue'
import Icon from '../components/ui/Icon.vue'

const { t, te } = useI18n()

const byLoc = ref(null)
onMounted(async () => (byLoc.value = await loadByLocation()))

const REGIONS = ['hoenn', 'kanto']
const REGION_OPTIONS = REGIONS.map((r) => ({ value: r, label: cap(r) })) // place names stay English in this stage
const maps = { kanto: kantoMap, hoenn: hoennMap }
const prefs = usePrefsStore()

// The region and the selected place live in the URL query (shareable, restored by Back).
// No region in the URL means the region of the global game (FireRed -> Kanto). The default is read at every parse,
// so this page, kept alive by KeepAlive, follows a game picked on another page.
const MAP_SCHEMA = {
  region: { kind: 'enum', values: REGIONS, get default() { return GAMES[prefs.version].region } },
  place: { kind: 'text', max: 60 }, // slug of the selected place
}
const { state: filters, set } = useQueryState(MAP_SCHEMA, { routeName: 'map' })

// Every place belongs to one region, so a place in the URL opens its own region whatever the global game
// (a link from a player of another game, Back after a game was picked on a Pokémon page).
const regionOf = (slug) =>
  REGIONS.find((r) => maps[r].places.some((pl) => pl.slug === slug) || Object.hasOwn(byLoc.value?.[r] ?? {}, slug))
const region = computed(() => (filters.value.place && regionOf(filters.value.place)) || filters.value.region)

const regionGames = computed(() => GAME_ORDER.filter((g) => GAMES[g].region === region.value))

function pickRegion(r) {
  set({ region: r, place: '' })
}

// a click, not typing: the place goes to the URL at once, so Back from one of its Pokémon finds it selected
const pickPlace = (slug) => set({ place: slug }, { immediate: true })

// Phone: the panel is a bottom sheet, open while a place is selected, and closing it clears the selection.
// The sheet also closes when the screen grows past phone width: then the selection stays, for the side panel.
function onSheetClose() {
  if (window.matchMedia?.('(max-width: 639px)').matches ?? true) pickPlace('')
}

/** locations with data that aren't placed on the map (roaming etc.) */
const offMap = computed(() => {
  if (!byLoc.value) return []
  const placed = new Set()
  for (const pl of maps[region.value].places) {
    placed.add(pl.slug)
    for (const a of pl.areas ?? []) placed.add(a)
  }
  return Object.entries(byLoc.value[region.value] ?? {})
    .filter(([slug]) => !placed.has(slug))
    .map(([slug, e]) => ({ slug, label: e.label }))
})

/** the place named in the URL: drawn on the region's map or listed off-map; anything else selects nothing */
const selected = computed(() => {
  const slug = filters.value.place
  if (!slug) return null
  const placed = maps[region.value].places.find((pl) => pl.slug === slug)
  if (placed) return placed
  const off = offMap.value.find((o) => o.slug === slug)
  return off ? { ...off, areas: [] } : null
})

/** all slugs (incl. collapsed areas) belonging to the selected place */
const selectedSlugs = computed(() => (selected.value ? [selected.value.slug, ...(selected.value.areas ?? [])] : []))

/** wild Pokémon of the selected place per version of its region; null until the encounter data is loaded */
const groups = computed(() => {
  if (!selected.value || !byLoc.value) return null
  const regData = byLoc.value[region.value] ?? {}
  const versions = {}
  for (const slug of selectedSlugs.value) {
    const entry = regData[slug]
    if (!entry) continue
    for (const [v, mons] of Object.entries(entry.versions)) {
      versions[v] ??= new Map()
      for (const mon of mons) {
        const cur = versions[v].get(mon.id)
        if (cur) cur.methods.push(...mon.methods)
        else versions[v].set(mon.id, { ...mon, methods: [...mon.methods] })
      }
    }
  }
  return regionGames.value
    .filter((v) => versions[v]?.size)
    .map((v) => ({ version: v, mons: [...versions[v].values()].sort((a, b) => a.id - b.id) }))
})

// methods outside the label list (roaming, in-game trade…) show their data slug
const methodLabel = (method) => (te(`methods.${method}`) ? t(`methods.${method}`) : method)
const levels = (m) => (m.max !== m.min ? `${m.min}–${m.max}` : String(m.min))
</script>

<template>
  <div>
    <PageHeader :title="t('map.title')" :accent="t('map.accent')">
      {{ t('map.subtitle') }}
      <template #actions>
        <Segmented :model-value="region" :options="REGION_OPTIONS" :label="t('map.region')" @update:model-value="pickRegion" />
      </template>
    </PageHeader>

    <div class="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <section class="animate-fadeup min-w-0 rounded-2xl border border-line bg-surface-1 p-4" style="animation-delay: 60ms">
        <RegionMap
          :map="maps[region]"
          :selected="selected?.slug"
          @select="pickPlace($event.slug)"
        />
        <div v-if="offMap.length" class="mt-3 border-t border-line pt-3">
          <h2 class="eyebrow">{{ t('map.offMap') }}</h2>
          <div class="mt-2 flex flex-wrap gap-1.5">
            <Chip
              v-for="o in offMap" :key="o.slug"
              :pressed="selected?.slug === o.slug"
              @click="pickPlace(o.slug)"
            >{{ o.label }}</Chip>
          </div>
        </div>
      </section>

      <Sheet
        :open="!!selected"
        :title="selected?.label ?? t('map.selectTitle')"
        :close-label="t('common.close')"
        class="animate-fadeup min-w-0 rounded-2xl border border-line bg-surface-1 p-5"
        style="animation-delay: 100ms"
        @close="onSheetClose"
      >
        <div v-if="!selected" class="grid h-full min-h-60 place-items-center text-center">
          <div>
            <p class="font-display text-base uppercase tracking-wider text-muted">{{ t('map.selectTitle') }}</p>
            <p class="mx-auto mt-2 max-w-60 text-sm text-dim text-pretty">{{ t('map.selectHint') }}</p>
          </div>
        </div>

        <template v-else>
          <!-- on a phone the sheet's own header carries the name -->
          <h2 class="mb-4 font-display text-xl text-ink max-sm:hidden">{{ selected.label }}</h2>

          <div v-if="!groups" aria-busy="true" class="space-y-2">
            <p class="sr-only">{{ t('common.loading') }}</p>
            <Skeleton w="40%" :h="14" />
            <Skeleton v-for="i in 4" :key="i" :h="66" :rounded="8" />
          </div>

          <EmptyState v-else-if="!groups.length" :title="t('map.none')" />

          <div v-else class="scrollbar-thin space-y-5 sm:max-h-150 sm:overflow-y-auto sm:pr-1">
            <section v-for="g in groups" :key="g.version">
              <h3
                class="sticky top-0 z-10 flex items-baseline gap-2 bg-surface-1 py-1 font-display text-sm uppercase tracking-wider"
                :style="{ color: GAMES[g.version].color }"
              >
                {{ GAMES[g.version].label }} <span class="num text-xs text-dim">{{ g.mons.length }}</span>
              </h3>
              <ul class="mt-1.5 space-y-1.5">
                <li v-for="mon in g.mons" :key="mon.id">
                  <RouterLink
                    :to="`/pokemon/${mon.id}`"
                    class="flex items-center gap-2 rounded-lg border border-line bg-bg/40 py-0.5 pl-1 pr-2.5 transition-colors hover:border-line2 hover:bg-surface-2"
                  >
                    <SpriteImg :src="spriteUrl(mon.id, 'gen3')" alt="" />
                    <div class="min-w-0">
                      <p class="text-sm font-medium text-ink">
                        <span class="num mr-1 text-xs text-dim">{{ dexNo(mon.id) }}</span>{{ mon.name }}
                      </p>
                      <ul class="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted tabular-nums">
                        <li v-for="(m, i) in mon.methods" :key="i" class="flex items-center gap-1">
                          <Icon v-if="METHOD_ICON_NAMES[m.method]" :name="METHOD_ICON_NAMES[m.method]" class="text-dim" />
                          {{ methodLabel(m.method) }} · {{ t('map.encounter', { lv: levels(m), chance: m.chance }) }}
                        </li>
                      </ul>
                    </div>
                  </RouterLink>
                </li>
              </ul>
            </section>
          </div>
        </template>
      </Sheet>
    </div>
  </div>
</template>
