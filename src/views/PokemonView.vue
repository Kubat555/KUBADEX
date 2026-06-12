<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { usePrefsStore } from '../stores/prefs'
import { loadPokemon, loadMoves, loadAbilities, spriteUrl, cryUrl } from '../lib/api'
import { matchupBuckets } from '../lib/typeChart'
import { GAMES, GAME_ORDER, METHOD_LABELS, METHOD_ICONS } from '../data/games'
import { SPECIAL_ENCOUNTERS } from '../data/specialEncounters'
import { dexNo, statTotal, STAT_LABELS, STAT_ORDER, fmtMult } from '../lib/utils'
import kantoMap from '../data/maps/kanto.json'
import hoennMap from '../data/maps/hoenn.json'
import TypeBadge from '../components/TypeBadge.vue'
import StatBar from '../components/StatBar.vue'
import GameTabs from '../components/GameTabs.vue'
import RegionMap from '../components/RegionMap.vue'
import EvolutionTree from '../components/EvolutionTree.vue'
import MovesTable from '../components/MovesTable.vue'
import CatchCalculator from '../components/CatchCalculator.vue'
import PokeballSpinner from '../components/PokeballSpinner.vue'

const route = useRoute()
const prefs = usePrefsStore()
const { version } = storeToRefs(prefs) // one game version, applied to every section
const p = ref(null)
const movedex = ref(null)
const abilitydex = ref(null)
const sprite = ref('gen3')

async function load(id) {
  p.value = null
  const [detail, moves, abilities] = await Promise.all([loadPokemon(id), loadMoves(), loadAbilities()])
  p.value = detail
  movedex.value = moves
  abilitydex.value = abilities
}

watch(() => route.params.id, (id) => id && load(Number(id)), { immediate: true })

// game sprite follows the chosen version (manual toggle still available)
watch([version, p], () => {
  if (!p.value) return
  sprite.value = GAMES[version.value].vg === 'firered-leafgreen' && p.value.hasFrlgSprite ? 'frlg' : 'gen3'
}, { immediate: true })

const specialFor = (id, v) => (SPECIAL_ENCOUNTERS[id] ?? []).filter((s) => s.games === 'all' || s.games.includes(v))

const buckets = computed(() => (p.value ? matchupBuckets(p.value.types) : null))
const bucketRows = computed(() =>
  [[4, 'WEAK ×4'], [2, 'WEAK ×2'], [0.5, 'RESIST ×½'], [0.25, 'RESIST ×¼'], [0, 'IMMUNE ×0']]
    .map(([m, label]) => ({ m, label, types: buckets.value?.[m] ?? [] }))
    .filter((r) => r.types.length),
)

const sprites = computed(() => {
  if (!p.value) return []
  const out = [{ id: 'gen3', label: 'EMERALD' }]
  if (p.value.hasFrlgSprite) out.push({ id: 'frlg', label: 'FR·LG' })
  out.push({ id: 'shiny', label: 'SHINY ✦' })
  return out
})

// --- flavor text (falls back to the closest version that has an entry) ---
const flavorVersion = computed(() => (p.value?.flavor[version.value] ? version.value : Object.keys(p.value?.flavor ?? {})[0]))
const flavorText = computed(() => p.value?.flavor[flavorVersion.value] ?? '')

// --- encounters ---
const encList = computed(() => p.value?.encounters[version.value] ?? [])
const specialNotes = computed(() => (p.value ? specialFor(p.value.id, version.value) : []))
const region = computed(() => GAMES[version.value].region)
const mapData = computed(() => (region.value === 'kanto' ? kantoMap : hoennMap))

const mapSlugIndex = computed(() => {
  const idx = new Map()
  for (const place of mapData.value.places) {
    idx.set(place.slug, place.slug)
    for (const a of place.areas ?? []) idx.set(a, place.slug)
  }
  return idx
})

const fmtMethod = (m) =>
  `${METHOD_ICONS[m.method] ?? '·'} ${METHOD_LABELS[m.method] ?? m.method} · Lv ${m.min}${m.max !== m.min ? '–' + m.max : ''} · ${m.chance}%`

const highlights = computed(() => {
  const out = {}
  for (const e of encList.value) {
    if (e.region !== region.value) continue
    const slug = mapSlugIndex.value.get(e.loc)
    if (!slug) continue
    out[slug] ??= { color: GAMES[version.value].color, lines: [] }
    out[slug].lines.push(...e.methods.map(fmtMethod))
  }
  return out
})

const offMapEncounters = computed(() =>
  encList.value.filter((e) => e.region !== region.value || !mapSlugIndex.value.get(e.loc)),
)

const versionsWithData = computed(() =>
  p.value ? GAME_ORDER.filter((v) => p.value.encounters[v]?.length || specialFor(p.value.id, v).length) : [],
)

const prevId = computed(() => (p.value && p.value.id > 1 ? p.value.id - 1 : null))
const nextId = computed(() => (p.value && p.value.id < 386 ? p.value.id + 1 : null))

// ← / → flip between entries (unless typing in a field)
const router = useRouter()
function onArrows(e) {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return
  if (e.key === 'ArrowLeft' && prevId.value) router.push(`/pokemon/${prevId.value}`)
  else if (e.key === 'ArrowRight' && nextId.value) router.push(`/pokemon/${nextId.value}`)
}
onMounted(() => window.addEventListener('keydown', onArrows))
onBeforeUnmount(() => window.removeEventListener('keydown', onArrows))

// GBA cry playback
const crying = ref(false)
function playCry() {
  const audio = new Audio(cryUrl(p.value.id))
  crying.value = true
  audio.addEventListener('ended', () => (crying.value = false))
  audio.addEventListener('error', () => (crying.value = false))
  audio.play().catch(() => (crying.value = false))
}
</script>

<template>
  <PokeballSpinner v-if="!p" label="OPENING ENTRY…" />

  <div v-else class="space-y-5">
    <!-- prev / next -->
    <nav class="flex items-center justify-between text-sm">
      <RouterLink v-if="prevId" :to="`/pokemon/${prevId}`" class="font-display text-muted transition-colors hover:text-ink">
        ← {{ dexNo(prevId) }}
      </RouterLink>
      <span v-else></span>
      <RouterLink v-if="nextId" :to="`/pokemon/${nextId}`" class="font-display text-muted transition-colors hover:text-ink">
        {{ dexNo(nextId) }} →
      </RouterLink>
    </nav>

    <!-- HERO -->
    <section
      class="animate-fadeup relative overflow-hidden rounded-2xl border border-line bg-panel/70 p-6 sm:p-8"
      :style="{ '--t': `var(--color-type-${p.types[0]})` }"
    >
      <div class="pointer-events-none absolute -left-20 -top-24 size-80 rounded-full opacity-[0.14] blur-3xl" :style="{ background: 'var(--t)' }"></div>
      <div class="pointer-events-none absolute right-6 top-6 hidden font-display text-7xl text-ink/5 lg:block">{{ dexNo(p.id) }}</div>

      <div class="relative grid gap-6 lg:grid-cols-[280px_1fr]">
        <!-- artwork + sprite toggles -->
        <div class="flex flex-col items-center">
          <img :src="spriteUrl(p.id, 'art')" :alt="p.label" class="size-56 object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.5)]" />
          <div class="mt-3 flex items-center gap-2 rounded-xl border border-line bg-bg/40 p-2">
            <img :src="spriteUrl(p.id, sprite)" :alt="`${p.label} sprite`" class="pixelated size-14 object-contain" :class="crying ? 'animate-marker' : ''" />
            <div class="flex flex-col gap-1">
              <button
                v-for="s in sprites" :key="s.id"
                class="rounded px-2 py-0.5 text-left font-display text-[10px] tracking-wider transition-colors"
                :class="sprite === s.id ? 'bg-panel2 text-ink' : 'text-dim hover:text-muted'"
                @click="sprite = s.id"
              >{{ s.label }}</button>
            </div>
          </div>
          <button
            class="mt-2 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-display text-xs tracking-wider transition-all"
            :class="crying ? 'border-dex bg-dex/15 text-dexglow' : 'border-line text-muted hover:border-dex hover:text-dexglow'"
            @click="playCry"
          >▶ CRY</button>
        </div>

        <!-- identity + flavor -->
        <div>
          <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 class="font-display text-4xl text-ink">{{ p.label }}</h1>
            <span class="text-sm text-muted">{{ p.genus }}</span>
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <TypeBadge v-for="t in p.types" :key="t" :type="t" />
            <span class="ml-2 font-display text-xs text-dim">
              NAT {{ dexNo(p.dex.national) }}
              <template v-if="p.dex.kanto"> · KANTO #{{ String(p.dex.kanto).padStart(3, '0') }}</template>
              <template v-if="p.dex.hoenn"> · HOENN #{{ String(p.dex.hoenn).padStart(3, '0') }}</template>
            </span>
          </div>

          <!-- game version: one switch for dex entry, sprite, encounters and moves -->
          <div class="mt-5">
            <p class="mb-1.5 font-display text-[10px] tracking-widest text-dim">GAME VERSION — APPLIES TO THE WHOLE PAGE</p>
            <GameTabs v-model="version" :active="versionsWithData" />
            <p class="mt-3 max-w-xl border-l-2 pl-4 text-sm leading-relaxed text-muted" :style="{ borderColor: GAMES[flavorVersion]?.color }">
              {{ flavorText }}
              <span v-if="flavorVersion !== version" class="mt-1 block text-[11px] text-dim">
                ({{ GAMES[version].label }} has no own dex entry — shown from {{ GAMES[flavorVersion]?.label }})
              </span>
            </p>
          </div>

          <dl class="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div><dt class="font-display text-[10px] tracking-wider text-dim">HEIGHT</dt><dd class="text-ink">{{ p.height }} m</dd></div>
            <div><dt class="font-display text-[10px] tracking-wider text-dim">WEIGHT</dt><dd class="text-ink">{{ p.weight }} kg</dd></div>
            <div>
              <dt class="font-display text-[10px] tracking-wider text-dim">ABILIT{{ p.abilities.length > 1 ? 'IES' : 'Y' }}</dt>
              <dd class="text-ink">{{ p.abilities.map((a) => abilitydex[a]?.label ?? a).join(' / ') }}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>

    <!-- STATS + MATCHUPS + ABILITIES -->
    <div class="grid gap-5 lg:grid-cols-2">
      <section class="animate-fadeup rounded-2xl border border-line bg-panel/70 p-5" style="animation-delay: 60ms">
        <h2 class="font-display text-sm tracking-widest text-dexglow">BASE STATS</h2>
        <div class="mt-4 space-y-2.5">
          <StatBar v-for="s in STAT_ORDER" :key="s" :label="STAT_LABELS[s]" :value="p.stats[s]" />
          <div class="flex items-center gap-3 border-t border-line pt-2.5">
            <span class="w-16 shrink-0 text-right text-xs font-semibold text-ink">Total</span>
            <span class="font-display text-sm text-dexglow">{{ statTotal(p.stats) }}</span>
          </div>
        </div>
      </section>

      <div class="space-y-5">
        <section class="animate-fadeup rounded-2xl border border-line bg-panel/70 p-5" style="animation-delay: 100ms">
          <h2 class="font-display text-sm tracking-widest text-dexglow">TYPE MATCHUPS</h2>
          <div class="mt-4 space-y-2.5">
            <div v-for="row in bucketRows" :key="row.m" class="flex items-start gap-3">
              <span class="w-20 shrink-0 pt-0.5 text-right font-display text-[10px] tracking-wider"
                :class="row.m >= 2 ? 'text-[#e0564b]' : row.m === 0 ? 'text-lens' : 'text-[#7ac74c]'"
              >{{ row.label }}</span>
              <div class="flex flex-wrap gap-1">
                <TypeBadge v-for="t in row.types" :key="t" :type="t" size="sm" />
              </div>
            </div>
            <p v-if="!bucketRows.length" class="text-sm text-dim">Takes neutral damage from everything.</p>
          </div>
        </section>

        <section class="animate-fadeup rounded-2xl border border-line bg-panel/70 p-5" style="animation-delay: 140ms">
          <h2 class="font-display text-sm tracking-widest text-dexglow">ABILITIES</h2>
          <ul class="mt-3 space-y-2.5">
            <li v-for="a in p.abilities" :key="a" class="text-sm">
              <span class="font-semibold text-ink">{{ abilitydex[a]?.label ?? a }}</span>
              <span class="text-muted"> — {{ abilitydex[a]?.effect }}</span>
            </li>
          </ul>
        </section>
      </div>
    </div>

    <!-- EVOLUTION -->
    <section v-if="p.evolution && (p.evolution.evolvesTo.length || p.evolution.id !== p.id)" class="animate-fadeup rounded-2xl border border-line bg-panel/70 p-5" style="animation-delay: 160ms">
      <h2 class="font-display text-sm tracking-widest text-dexglow">EVOLUTION</h2>
      <div class="scrollbar-thin mt-4 overflow-x-auto pb-1">
        <EvolutionTree :node="p.evolution" :current-id="p.id" />
      </div>
    </section>

    <!-- ENCOUNTERS -->
    <section class="animate-fadeup rounded-2xl border border-line bg-panel/70 p-5" style="animation-delay: 200ms">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="font-display text-sm tracking-widest text-dexglow">WHERE TO FIND</h2>
        <span class="font-display text-xs tracking-wider" :style="{ color: GAMES[version].color }">{{ GAMES[version].label.toUpperCase() }}</span>
      </div>

      <div v-if="!encList.length && !specialNotes.length" class="mt-5 rounded-xl border border-dashed border-line p-8 text-center">
        <p class="text-sm text-muted">Not found in the wild in <span :style="{ color: GAMES[version].color }">{{ GAMES[version].label }}</span>.</p>
        <p class="mt-1 text-xs text-dim">Try evolving, breeding or trading from another version.</p>
      </div>

      <div v-else class="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div class="min-w-0 rounded-xl border border-line bg-bg/50 p-3">
          <RegionMap :map="mapData" :highlights="highlights" :interactive="false" />
        </div>

        <div class="scrollbar-thin max-h-130 space-y-2 overflow-y-auto pr-1">
          <div
            v-for="s in specialNotes" :key="s.note"
            class="rounded-lg border border-lens/40 bg-lens/5 p-3 text-sm"
          >
            <span class="font-display text-[10px] tracking-wider text-lens">SPECIAL</span>
            <p class="mt-0.5 text-muted">{{ s.note }}</p>
          </div>

          <div
            v-for="e in encList" :key="e.loc"
            class="rounded-lg border border-line bg-panel p-3"
          >
            <p class="text-sm font-semibold text-ink">
              {{ e.label }}
              <span v-if="e.region !== region" class="ml-1 font-display text-[10px] tracking-wider text-dim">({{ e.region.toUpperCase() }})</span>
            </p>
            <ul class="mt-1 space-y-0.5">
              <li v-for="m in e.methods" :key="m.method" class="text-xs text-muted">{{ fmtMethod(m) }}</li>
            </ul>
          </div>
        </div>
      </div>
      <p v-if="offMapEncounters.length && encList.length" class="mt-2 text-[11px] text-dim">
        Locations outside the {{ mapData.label }} town map appear only in the list.
      </p>
    </section>

    <!-- MOVES -->
    <section class="animate-fadeup rounded-2xl border border-line bg-panel/70 p-5" style="animation-delay: 240ms">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 class="font-display text-sm tracking-widest text-dexglow">MOVES</h2>
        <span class="font-display text-xs tracking-wider" :style="{ color: GAMES[version].color }">{{ GAMES[version].label.toUpperCase() }}</span>
      </div>
      <MovesTable :moves="p.moves" :movedex="movedex" :version-group="GAMES[version].vg" />
    </section>

    <!-- TRAINING / BREEDING -->
    <section class="animate-fadeup rounded-2xl border border-line bg-panel/70 p-5" style="animation-delay: 280ms">
      <h2 class="font-display text-sm tracking-widest text-dexglow">TRAINING &amp; BREEDING</h2>
      <dl class="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-4">
        <div><dt class="font-display text-[10px] tracking-wider text-dim">CATCH RATE</dt><dd class="text-ink">{{ p.training.catchRate }} <span class="text-xs text-dim">/ 255</span></dd></div>
        <div><dt class="font-display text-[10px] tracking-wider text-dim">BASE EXP</dt><dd class="text-ink">{{ p.baseExp ?? '—' }}</dd></div>
        <div><dt class="font-display text-[10px] tracking-wider text-dim">GROWTH</dt><dd class="text-ink">{{ p.training.growthRate }}</dd></div>
        <div><dt class="font-display text-[10px] tracking-wider text-dim">BASE HAPPINESS</dt><dd class="text-ink">{{ p.training.baseHappiness }}</dd></div>
        <div>
          <dt class="font-display text-[10px] tracking-wider text-dim">EV YIELD</dt>
          <dd class="text-ink">{{ Object.entries(p.training.evYield).map(([k, v]) => `${v} ${STAT_LABELS[k]}`).join(', ') || '—' }}</dd>
        </div>
        <div>
          <dt class="font-display text-[10px] tracking-wider text-dim">GENDER</dt>
          <dd class="text-ink">
            <template v-if="p.training.genderFemale === null">Genderless</template>
            <template v-else>
              <span class="text-[#6d96d8]">♂ {{ 100 - p.training.genderFemale }}%</span> ·
              <span class="text-[#f97176]">♀ {{ p.training.genderFemale }}%</span>
            </template>
          </dd>
        </div>
        <div><dt class="font-display text-[10px] tracking-wider text-dim">EGG GROUPS</dt><dd class="text-ink">{{ p.training.eggGroups.join(', ') || '—' }}</dd></div>
        <div><dt class="font-display text-[10px] tracking-wider text-dim">HATCH STEPS</dt><dd class="text-ink">~{{ p.training.hatchSteps.toLocaleString() }}</dd></div>
      </dl>

      <div class="mt-6 border-t border-line pt-5">
        <h3 class="mb-4 font-display text-sm tracking-widest text-dexglow">CATCH CALCULATOR</h3>
        <CatchCalculator :catch-rate="p.training.catchRate" :types="p.types" />
      </div>
    </section>
  </div>
</template>
