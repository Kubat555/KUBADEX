<script setup>
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { usePrefsStore } from '../stores/prefs'
import { loadIndex, loadByLocation, spriteUrl } from '../lib/api'
import { GAMES, METHOD_LABELS, METHOD_ICONS } from '../data/games'
import { STAT_LABELS, STAT_ORDER } from '../lib/utils'
import GameTabs from '../components/GameTabs.vue'
import PokeballSpinner from '../components/PokeballSpinner.vue'

const { version } = storeToRefs(usePrefsStore())
const stat = ref('spe')

const indexById = ref(null)
const byLoc = ref(null)
onMounted(async () => {
  const [idx, locs] = await Promise.all([loadIndex(), loadByLocation()])
  indexById.value = Object.fromEntries(idx.map((p) => [p.id, p]))
  byLoc.value = locs
})

const region = computed(() => GAMES[version.value].region)

/**
 * For each location: per encounter method, expected EVs of the chosen stat per encounter
 * = Σ over slots (chance/100 × EV yield). The best method wins the ranking.
 */
const hotspots = computed(() => {
  if (!byLoc.value || !indexById.value) return []
  const out = []
  for (const [slug, loc] of Object.entries(byLoc.value[region.value] ?? {})) {
    const mons = loc.versions[version.value]
    if (!mons) continue
    const perMethod = {} // method -> { ev, mons: Map }
    for (const mon of mons) {
      const yieldVal = indexById.value[mon.id]?.evYield?.[stat.value] ?? 0
      if (!yieldVal) continue
      for (const m of mon.methods) {
        const agg = (perMethod[m.method] ??= { ev: 0, mons: new Map() })
        agg.ev += (m.chance / 100) * yieldVal
        const cur = agg.mons.get(mon.id)
        if (!cur || cur.chance < m.chance) agg.mons.set(mon.id, { id: mon.id, name: mon.name, chance: m.chance, yield: yieldVal })
      }
    }
    const best = Object.entries(perMethod).sort((a, b) => b[1].ev - a[1].ev)[0]
    if (!best || best[1].ev < 0.1) continue
    out.push({
      slug,
      label: loc.label,
      method: best[0],
      ev: best[1].ev,
      mons: [...best[1].mons.values()].sort((a, b) => b.chance * b.yield - a.chance * a.yield),
    })
  }
  return out.sort((a, b) => b.ev - a.ev).slice(0, 12)
})

const maxEv = computed(() => hotspots.value[0]?.ev ?? 1)
</script>

<template>
  <div>
    <section class="animate-fadeup mb-5 flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-line bg-panel/60 p-5">
      <div>
        <h1 class="font-display text-2xl text-ink">EV <span class="text-dexglow">HOTSPOTS</span></h1>
        <p class="mt-1 text-sm text-muted">
          Best places to grind effort values — ranked by expected EVs per wild encounter, computed from real encounter tables.
        </p>
      </div>
      <GameTabs v-model="version" />
    </section>

    <div class="animate-fadeup mb-5 flex flex-wrap gap-1.5" style="animation-delay: 60ms">
      <button
        v-for="s in STAT_ORDER" :key="s"
        class="rounded-lg border px-3 py-1.5 font-display text-xs tracking-wider transition-all"
        :class="stat === s ? 'border-dex bg-dex/15 text-dexglow' : 'border-line text-muted hover:border-line2 hover:text-ink'"
        @click="stat = s"
      >{{ STAT_LABELS[s].toUpperCase() }}</button>
    </div>

    <PokeballSpinner v-if="!byLoc" label="CRUNCHING TABLES…" />
    <div v-else-if="!hotspots.length" class="rounded-2xl border border-dashed border-line py-16 text-center text-sm text-dim">
      No good spots for this stat here — try another version.
    </div>

    <div class="space-y-2.5">
      <section
        v-for="(h, i) in hotspots" :key="h.slug"
        class="animate-fadeup rounded-2xl border border-line bg-panel/70 p-4"
        :style="{ animationDelay: i * 35 + 'ms' }"
      >
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span class="w-7 font-display text-lg" :class="i === 0 ? 'text-dexglow' : 'text-dim'">{{ i + 1 }}</span>
          <h2 class="font-display text-base text-ink">{{ h.label }}</h2>
          <span class="text-xs text-muted">{{ METHOD_ICONS[h.method] ?? '·' }} {{ METHOD_LABELS[h.method] ?? h.method }}</span>
          <div class="ml-auto flex items-center gap-3">
            <div class="hidden h-1.5 w-36 overflow-hidden rounded-full bg-panel2 sm:block">
              <div class="h-full rounded-full bg-gradient-to-r from-dex to-dexglow" :style="{ width: (h.ev / maxEv) * 100 + '%' }"></div>
            </div>
            <span class="font-display text-sm text-dexglow">{{ h.ev.toFixed(2) }} <span class="text-[10px] text-dim">{{ STAT_LABELS[stat] }} EV / encounter</span></span>
          </div>
        </div>
        <div class="mt-2.5 flex flex-wrap gap-1.5 pl-11">
          <RouterLink
            v-for="m in h.mons" :key="m.id"
            :to="`/pokemon/${m.id}`"
            class="flex items-center gap-1.5 rounded-lg border border-line bg-bg/40 py-1 pl-1 pr-2 transition-colors hover:border-line2 hover:bg-panel2"
          >
            <img :src="spriteUrl(m.id, 'icons')" class="pixelated size-6" :alt="m.name" />
            <span class="text-xs text-ink">{{ m.name }}</span>
            <span class="font-display text-[10px] text-dim">+{{ m.yield }} · {{ m.chance }}%</span>
          </RouterLink>
        </div>
      </section>
    </div>

    <p v-if="hotspots.length" class="mt-4 text-[11px] text-dim">
      Expected EVs assume one knock-out per encounter at the listed method. Macho Brace doubles the gain; Pokérus doubles it again.
    </p>
  </div>
</template>
