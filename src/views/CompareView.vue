<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loadPokemon, loadAbilities, spriteUrl } from '../lib/api'
import { TYPES, defenseProfile } from '../lib/typeChart'
import { dexNo, statTotal, STAT_LABELS, STAT_ORDER, fmtMult } from '../lib/utils'
import TypeBadge from '../components/TypeBadge.vue'
import PokemonPicker from '../components/PokemonPicker.vue'

const route = useRoute()
const router = useRouter()
const mons = ref([])
const abilitydex = ref({})

const ids = computed(() =>
  String(route.query.p ?? '')
    .split(',')
    .map(Number)
    .filter((n) => n >= 1 && n <= 386)
    .slice(0, 3),
)

watch(
  ids,
  async (list) => {
    abilitydex.value = await loadAbilities()
    mons.value = await Promise.all(list.map(loadPokemon))
  },
  { immediate: true },
)

const setIds = (list) => router.replace({ query: list.length ? { p: list.join(',') } : {} })
const add = (id) => !ids.value.includes(id) && setIds([...ids.value, id])
const remove = (id) => setIds(ids.value.filter((x) => x !== id))

const COLORS = ['#ff7327', '#58c7f3', '#7ac74c']

// --- radar chart ---
const R = 80
const CX = 110
const CY = 100
const MAX = 160
const axes = STAT_ORDER.map((s, i) => {
  const a = (Math.PI * 2 * i) / 6 - Math.PI / 2
  return { stat: s, x: Math.cos(a), y: Math.sin(a) }
})
const axisPt = (axis, r) => `${CX + axis.x * r},${CY + axis.y * r}`
const ringPoints = (f) => axes.map((a) => axisPt(a, R * f)).join(' ')
const monPoints = (m) =>
  axes.map((a) => axisPt(a, R * Math.min(1, m.stats[a.stat] / MAX))).join(' ')

const profiles = computed(() => mons.value.map((m) => defenseProfile(m.types)))
const statMax = (s) => Math.max(...mons.value.map((m) => m.stats[s]))
</script>

<template>
  <div>
    <section class="animate-fadeup mb-5 rounded-2xl border border-line bg-panel/60 p-5">
      <h1 class="font-display text-2xl text-ink">COMPARE <span class="text-dexglow">POKÉMON</span></h1>
      <p class="mt-1 text-sm text-muted">Put up to three side by side — stats, typing and defensive matchups.</p>
      <div class="mt-3 max-w-72">
        <PokemonPicker v-if="ids.length < 3" :exclude="ids" @pick="add" />
      </div>
    </section>

    <div v-if="!mons.length" class="rounded-2xl border border-dashed border-line py-20 text-center text-sm text-dim">
      Pick a Pokémon above to start comparing.
    </div>

    <template v-else>
      <!-- contenders -->
      <div class="grid gap-4" :class="mons.length === 1 ? 'sm:grid-cols-1' : mons.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'">
        <section
          v-for="(m, i) in mons" :key="m.id"
          class="animate-fadeup relative rounded-2xl border bg-panel/70 p-4 text-center"
          :style="{ borderColor: `color-mix(in srgb, ${COLORS[i]} 45%, var(--color-line))`, animationDelay: i * 60 + 'ms' }"
        >
          <button class="absolute right-2.5 top-2 text-dim transition-colors hover:text-dexglow" title="Remove" @click="remove(m.id)">✕</button>
          <RouterLink :to="`/pokemon/${m.id}`">
            <img :src="spriteUrl(m.id, 'art')" :alt="m.label" class="mx-auto size-28 object-contain drop-shadow-lg" />
            <p class="mt-1 font-display text-xs" :style="{ color: COLORS[i] }">{{ dexNo(m.id) }}</p>
            <p class="font-display text-xl text-ink">{{ m.label }}</p>
          </RouterLink>
          <div class="mt-1.5 flex justify-center gap-1"><TypeBadge v-for="t in m.types" :key="t" :type="t" size="sm" /></div>
          <p class="mt-2 text-xs text-muted">{{ m.abilities.map((a) => abilitydex[a]?.label ?? a).join(' / ') }}</p>
          <p class="mt-1 text-xs font-medium text-dim tabular-nums">BST {{ statTotal(m.stats) }} · {{ m.height }} m · {{ m.weight }} kg</p>
        </section>
      </div>

      <div class="mt-5 grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        <!-- radar -->
        <section class="animate-fadeup rounded-2xl border border-line bg-panel/70 p-5" style="animation-delay: 120ms">
          <h2 class="font-display text-sm tracking-widest text-dexglow">STAT RADAR</h2>
          <svg viewBox="0 0 220 200" class="mx-auto mt-2 w-full max-w-90">
            <polygon v-for="f in [1, 0.75, 0.5, 0.25]" :key="f" :points="ringPoints(f)" fill="none" stroke="var(--color-line)" stroke-width="1" />
            <line v-for="a in axes" :key="a.stat" :x1="CX" :y1="CY" :x2="CX + a.x * R" :y2="CY + a.y * R" stroke="var(--color-line)" stroke-width="1" />
            <polygon
              v-for="(m, i) in mons" :key="m.id"
              :points="monPoints(m)"
              :fill="COLORS[i] + '2a'"
              :stroke="COLORS[i]"
              stroke-width="1.8"
              stroke-linejoin="round"
            />
            <text
              v-for="a in axes" :key="'t' + a.stat"
              :x="CX + a.x * (R + 16)" :y="CY + a.y * (R + 16) + 3"
              text-anchor="middle" fill="var(--color-muted)"
              style="font-family: var(--font-display); font-size: 9.5px"
            >{{ STAT_LABELS[a.stat].toUpperCase() }}</text>
          </svg>
        </section>

        <!-- stat bars -->
        <section class="animate-fadeup rounded-2xl border border-line bg-panel/70 p-5" style="animation-delay: 160ms">
          <h2 class="font-display text-sm tracking-widest text-dexglow">BASE STATS</h2>
          <div class="mt-4 space-y-3.5">
            <div v-for="s in STAT_ORDER" :key="s">
              <p class="mb-1 text-xs font-medium text-muted">{{ STAT_LABELS[s] }}</p>
              <div class="space-y-1">
                <div v-for="(m, i) in mons" :key="m.id" class="flex items-center gap-2">
                  <span class="w-8 text-right text-sm font-semibold tabular-nums" :class="m.stats[s] === statMax(s) && mons.length > 1 ? 'text-ink' : 'text-dim'">{{ m.stats[s] }}</span>
                  <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-panel2">
                    <div
                      class="h-full rounded-full transition-[width] duration-700"
                      :style="{ width: Math.min(100, (m.stats[s] / 180) * 100) + '%', background: COLORS[i], opacity: m.stats[s] === statMax(s) ? 1 : 0.55 }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- defensive matchups -->
      <section class="animate-fadeup mt-5 rounded-2xl border border-line bg-panel/70 p-5" style="animation-delay: 200ms">
        <h2 class="font-display text-sm tracking-widest text-dexglow">DAMAGE TAKEN</h2>
        <div class="scrollbar-thin mt-3 overflow-x-auto">
          <table class="w-full min-w-130 text-sm">
            <thead>
              <tr class="border-b border-line text-left">
                <th class="py-2 pr-3 font-display text-[11px] tracking-wider text-dim">VS</th>
                <th v-for="(m, i) in mons" :key="m.id" class="py-2 pr-3 font-display text-sm" :style="{ color: COLORS[i] }">{{ m.label.toUpperCase() }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in TYPES" :key="t" class="border-b border-line/40">
                <td class="py-2 pr-3"><TypeBadge :type="t" size="sm" /></td>
                <td v-for="(m, i) in mons" :key="m.id" class="py-2 pr-3 tabular-nums">
                  <span
                    class="inline-block rounded px-1.5 py-0.5 text-base font-bold"
                    :class="profiles[i][t] > 1 ? 'bg-[#e0564b]/12 text-[#e0564b]' : profiles[i][t] === 0 ? 'bg-lens/12 text-lens' : profiles[i][t] < 1 ? 'bg-[#7ac74c]/12 text-[#7ac74c]' : 'text-dim'"
                  >×{{ fmtMult(profiles[i][t]) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>
