<script setup>
import { ref, computed, onMounted } from 'vue'
import { loadByLocation, spriteUrl } from '../lib/api'
import { GAMES, GAME_ORDER, METHOD_LABELS, METHOD_ICONS } from '../data/games'
import { dexNo } from '../lib/utils'
import kantoMap from '../data/maps/kanto.json'
import hoennMap from '../data/maps/hoenn.json'
import RegionMap from '../components/RegionMap.vue'

const byLoc = ref(null)
onMounted(async () => (byLoc.value = await loadByLocation()))

const region = ref('hoenn')
const maps = { kanto: kantoMap, hoenn: hoennMap }
const selected = ref(null) // place object

const regionGames = computed(() => GAME_ORDER.filter((g) => GAMES[g].region === region.value))

function pickRegion(r) {
  region.value = r
  selected.value = null
}

/** all slugs (incl. collapsed areas) belonging to the selected place */
const selectedSlugs = computed(() => (selected.value ? [selected.value.slug, ...(selected.value.areas ?? [])] : []))

const panel = computed(() => {
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
  const ordered = regionGames.value
    .filter((v) => versions[v]?.size)
    .map((v) => ({ version: v, mons: [...versions[v].values()].sort((a, b) => a.id - b.id) }))
  return { label: selected.value.label, groups: ordered }
})

const fmtMethod = (m) =>
  `${METHOD_ICONS[m.method] ?? '·'} ${METHOD_LABELS[m.method] ?? m.method} · Lv ${m.min}${m.max !== m.min ? '–' + m.max : ''} · ${m.chance}%`

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

function pickOffMap(o) {
  selected.value = { slug: o.slug, label: o.label, areas: [] }
}
</script>

<template>
  <div>
    <section class="animate-fadeup mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-panel/60 p-5">
      <div>
        <h1 class="font-display text-2xl text-ink">MAP <span class="text-dexglow">EXPLORER</span></h1>
        <p class="mt-1 text-sm text-muted">Click any location to see every wild Pokémon there, per version.</p>
      </div>
      <div class="flex overflow-hidden rounded-lg border border-line">
        <button
          v-for="r in ['hoenn', 'kanto']" :key="r"
          class="px-4 py-2 font-display text-sm uppercase tracking-wider transition-colors"
          :class="region === r ? 'bg-panel2 text-dexglow' : 'text-dim hover:text-muted'"
          @click="pickRegion(r)"
        >{{ r }}</button>
      </div>
    </section>

    <div class="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
      <section class="animate-fadeup min-w-0 rounded-2xl border border-line bg-panel/60 p-4" style="animation-delay: 60ms">
        <RegionMap
          :map="maps[region]"
          :selected="selected?.slug"
          @select="selected = $event"
        />
        <div v-if="offMap.length" class="mt-3 border-t border-line pt-3">
          <p class="font-display text-[10px] tracking-wider text-dim">OFF-MAP AREAS</p>
          <div class="mt-1.5 flex flex-wrap gap-1.5">
            <button
              v-for="o in offMap" :key="o.slug"
              class="rounded-md border px-2 py-1 text-xs transition-colors"
              :class="selected?.slug === o.slug ? 'border-dexglow text-dexglow' : 'border-line text-muted hover:border-line2 hover:text-ink'"
              @click="pickOffMap(o)"
            >{{ o.label }}</button>
          </div>
        </div>
      </section>

      <section class="animate-fadeup min-w-0 rounded-2xl border border-line bg-panel/60 p-5" style="animation-delay: 100ms">
        <div v-if="!selected" class="grid h-full min-h-60 place-items-center text-center">
          <div>
            <p class="font-display text-sm tracking-widest text-dim">SELECT A LOCATION</p>
            <p class="mt-2 max-w-55 text-xs text-dim">Cities, routes, caves and forests — anything glowing has wild Pokémon.</p>
          </div>
        </div>

        <template v-else>
          <h2 class="font-display text-xl text-ink">{{ panel?.label ?? selected.label }}</h2>

          <div v-if="!panel?.groups.length" class="mt-4 rounded-lg border border-dashed border-line p-6 text-center text-sm text-dim">
            No wild encounters recorded here.
          </div>

          <div v-else class="scrollbar-thin mt-4 max-h-150 space-y-5 overflow-y-auto pr-1">
            <div v-for="g in panel.groups" :key="g.version">
              <p class="sticky top-0 bg-panel py-1 font-display text-xs tracking-widest" :style="{ color: GAMES[g.version].color }">
                {{ GAMES[g.version].label.toUpperCase() }} <span class="text-dim">· {{ g.mons.length }}</span>
              </p>
              <ul class="mt-1.5 space-y-1.5">
                <li v-for="mon in g.mons" :key="mon.id">
                  <RouterLink
                    :to="`/pokemon/${mon.id}`"
                    class="group/mon flex items-center gap-2.5 rounded-lg border border-line bg-bg/40 px-2 py-1.5 transition-colors hover:border-line2 hover:bg-panel2"
                  >
                    <img :src="spriteUrl(mon.id, 'gen3')" class="pixelated size-12 shrink-0 object-contain transition-transform duration-200 group-hover/mon:scale-110" alt="" />
                    <div class="min-w-0">
                      <p class="text-sm font-medium text-ink">
                        <span class="font-display text-[10px] text-dim">{{ dexNo(mon.id) }}</span>
                        {{ mon.name }}
                      </p>
                      <p class="truncate text-[11px] text-dim">{{ mon.methods.map(fmtMethod).join('  ·  ') }}</p>
                    </div>
                  </RouterLink>
                </li>
              </ul>
            </div>
          </div>
        </template>
      </section>
    </div>
  </div>
</template>
