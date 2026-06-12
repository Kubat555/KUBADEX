<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { loadIndex } from '../lib/api'
import { TYPES } from '../lib/typeChart'
import { GAMES, GAME_ORDER } from '../data/games'
import { statTotal } from '../lib/utils'
import PokemonCard from '../components/PokemonCard.vue'
import PokeballSpinner from '../components/PokeballSpinner.vue'
import TypeBadge from '../components/TypeBadge.vue'
import { spriteUrl, cryUrl } from '../lib/api'

const index = ref([])
const loaded = ref(false)
onMounted(async () => {
  index.value = await loadIndex()
  loaded.value = true
})

const router = useRouter()
const goRandom = () => router.push(`/pokemon/${Math.floor(Math.random() * 386) + 1}`)

// ---- Who's that Pokémon? — deterministic daily pick, guess to reveal ----
const now = new Date()
const featuredId = (now.getFullYear() * 372 + (now.getMonth() + 1) * 31 + now.getDate()) % 386 + 1
const featured = computed(() => index.value.find((p) => p.id === featuredId))

const WTP_KEY = 'dex3-wtp'
const dateKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
const solved = ref(false)
const gaveUp = ref(false)
const misses = ref(0)
try {
  const saved = JSON.parse(localStorage.getItem(WTP_KEY))
  if (saved?.date === dateKey) {
    solved.value = !!saved.solved
    gaveUp.value = !!saved.gaveUp
    misses.value = saved.misses ?? 0
  }
} catch { /* fresh day */ }
const saveWtp = () =>
  localStorage.setItem(WTP_KEY, JSON.stringify({ date: dateKey, solved: solved.value, gaveUp: gaveUp.value, misses: misses.value }))

const guess = ref('')
const wrongShake = ref(0) // increments to retrigger the shake animation
const guessMsg = ref('')
const revealed = computed(() => solved.value || gaveUp.value)

const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

function submitGuess() {
  const q = normalize(guess.value)
  if (!q || !featured.value) return
  if (q === normalize(featured.value.name) || q === normalize(featured.value.label)) {
    solved.value = true
    guessMsg.value = ''
    saveWtp()
    playCry()
    return
  }
  const known = index.value.some((p) => normalize(p.name) === q || normalize(p.label) === q)
  guessMsg.value = known ? 'Nope, that’s not it!' : 'No such Pokémon in this dex…'
  misses.value++
  wrongShake.value++
  guess.value = ''
  saveWtp()
}

function giveUp() {
  gaveUp.value = true
  guessMsg.value = ''
  saveWtp()
}

const crying = ref(false)
function playCry() {
  const audio = new Audio(cryUrl(featuredId))
  crying.value = true
  audio.addEventListener('ended', () => (crying.value = false))
  audio.addEventListener('error', () => (crying.value = false))
  audio.play().catch(() => (crying.value = false))
}

const query = ref('')
const selectedTypes = ref([])
const game = ref(null)
const dex = ref('national') // national | kanto | hoenn
const sort = ref('id')

const SORTS = [
  { id: 'id', label: 'Dex №' },
  { id: 'name', label: 'Name' },
  { id: 'bst', label: 'Total stats' },
  { id: 'hp', label: 'HP' },
  { id: 'atk', label: 'Attack' },
  { id: 'def', label: 'Defense' },
  { id: 'spa', label: 'Sp. Atk' },
  { id: 'spd', label: 'Sp. Def' },
  { id: 'spe', label: 'Speed' },
]

function toggleType(t) {
  const i = selectedTypes.value.indexOf(t)
  if (i === -1) {
    selectedTypes.value.push(t)
    if (selectedTypes.value.length > 2) selectedTypes.value.shift()
  } else selectedTypes.value.splice(i, 1)
}

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  let list = index.value
  if (dex.value !== 'national') list = list.filter((p) => p.dex[dex.value])
  if (game.value) list = list.filter((p) => p.games.includes(game.value))
  if (selectedTypes.value.length) list = list.filter((p) => selectedTypes.value.every((t) => p.types.includes(t)))
  if (q) list = list.filter((p) => p.name.includes(q) || String(p.id) === q)

  const s = sort.value
  list = [...list]
  if (s === 'name') list.sort((a, b) => a.name.localeCompare(b.name))
  else if (s === 'bst') list.sort((a, b) => statTotal(b.stats) - statTotal(a.stats))
  else if (s !== 'id') list.sort((a, b) => b.stats[s] - a.stats[s])
  else if (dex.value !== 'national') list.sort((a, b) => a.dex[dex.value] - b.dex[dex.value])
  return list
})

const reset = () => { query.value = ''; selectedTypes.value = []; game.value = null; dex.value = 'national'; sort.value = 'id' }
const hasFilters = computed(() => query.value || selectedTypes.value.length || game.value || dex.value !== 'national' || sort.value !== 'id')
</script>

<template>
  <div>
    <!-- hero -->
    <section class="animate-fadeup relative mb-6 overflow-hidden rounded-2xl border border-line bg-panel/60 p-6 sm:p-8">
      <div
        v-if="featured"
        class="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full opacity-[0.12] blur-3xl"
        :style="{ background: `var(--color-type-${featured.types[0]})` }"
      ></div>
      <div class="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="font-display text-3xl leading-tight text-ink sm:text-4xl">
            GEN III <span class="text-dexglow">FIELD GUIDE</span>
          </h1>
          <p class="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Every Pokémon of FireRed, LeafGreen, Ruby, Sapphire &amp; Emerald — stats, abilities, evolutions,
            full movesets and exactly <RouterLink to="/map" class="text-lens underline decoration-line2 hover:text-ink">where to find them</RouterLink>
            in each version.
          </p>
        </div>

        <!-- Who's that Pokémon? -->
        <div v-if="featured" class="flex shrink-0 items-center gap-4 sm:pr-2">
          <component
            :is="revealed ? 'router-link' : 'div'"
            :to="revealed ? `/pokemon/${featured.id}` : undefined"
            class="group relative"
          >
            <img
              :src="spriteUrl(featured.id, 'art')"
              :alt="revealed ? featured.label : '???'"
              class="size-28 object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.5)] transition-all duration-500 sm:size-32"
              :class="revealed ? 'group-hover:scale-110' : 'brightness-0 invert'"
              draggable="false"
            />
          </component>

          <!-- unsolved: the quiz -->
          <div v-if="!revealed" class="w-52">
            <p class="font-display text-[10px] tracking-[0.2em] text-lens">WHO'S THAT POKÉMON?</p>
            <form class="mt-1.5 flex gap-1.5" :key="wrongShake" :class="wrongShake ? 'shake' : ''" @submit.prevent="submitGuess">
              <input
                v-model="guess"
                type="text"
                placeholder="Your guess…"
                autocomplete="off"
                class="w-full min-w-0 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-dim focus:border-lens"
              />
              <button type="submit" class="rounded-lg border border-lens/50 px-2.5 font-display text-[10px] tracking-wider text-lens transition-colors hover:bg-lens/10">GO</button>
            </form>
            <p v-if="guessMsg" class="mt-1 text-[11px] text-[#e0564b]">{{ guessMsg }}</p>
            <div v-if="misses >= 1" class="mt-1.5 flex items-center gap-1.5">
              <span class="font-display text-[9px] tracking-wider text-dim">HINT</span>
              <TypeBadge v-for="t in featured.types" :key="t" :type="t" size="sm" />
              <span v-if="misses >= 2" class="text-[11px] text-muted">{{ featured.genus }}</span>
            </div>
            <button v-if="misses >= 3" class="mt-1.5 text-[11px] text-dim underline hover:text-muted" @click="giveUp">I give up, show me</button>
          </div>

          <!-- revealed -->
          <div v-else>
            <p class="font-display text-[10px] tracking-[0.2em]" :class="solved ? 'text-[#7ac74c]' : 'text-dim'">
              {{ solved ? "IT'S…" : 'IT WAS…' }}
            </p>
            <RouterLink :to="`/pokemon/${featured.id}`" class="font-display text-xl text-ink transition-colors hover:text-dexglow">
              {{ featured.label }}<span v-if="solved">!</span>
            </RouterLink>
            <p class="text-xs text-muted">{{ featured.genus }}</p>
            <div class="mt-1.5 flex items-center gap-1.5">
              <TypeBadge v-for="t in featured.types" :key="t" :type="t" size="sm" />
              <button
                class="rounded-md border px-2 py-0.5 font-display text-[10px] tracking-wider transition-all"
                :class="crying ? 'border-dex bg-dex/15 text-dexglow' : 'border-line text-dim hover:border-dex hover:text-dexglow'"
                @click="playCry"
              >▶ CRY</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- filters -->
    <section class="animate-fadeup mb-6 space-y-3 rounded-2xl border border-line bg-panel/60 p-4" style="animation-delay: 60ms">
      <div class="flex flex-wrap items-center gap-2.5 sm:gap-3">
        <input
          v-model="query"
          type="search"
          placeholder="Name or number…"
          class="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink outline-none placeholder:text-dim focus:border-dex sm:w-48"
        />
        <div class="flex w-full overflow-hidden rounded-lg border border-line sm:w-auto">
          <button
            v-for="d in ['national', 'kanto', 'hoenn']" :key="d"
            class="flex-1 px-3 py-2 font-display text-xs uppercase tracking-wider transition-colors sm:flex-none"
            :class="dex === d ? 'bg-panel2 text-ink' : 'text-dim hover:text-muted'"
            @click="dex = d"
          >{{ d }}</button>
        </div>
        <select
          v-model="sort"
          class="min-w-0 flex-1 rounded-lg border border-line bg-panel px-2.5 py-2 text-sm text-muted outline-none focus:border-dex sm:flex-none"
        >
          <option v-for="s in SORTS" :key="s.id" :value="s.id">Sort: {{ s.label }}</option>
        </select>
        <button
          class="rounded-lg border border-line px-2.5 py-2 font-display text-xs tracking-wider text-muted transition-all hover:border-dex hover:text-dexglow"
          title="Open a random Pokémon"
          @click="goRandom"
        >🎲 RANDOM</button>
        <button v-if="hasFilters" class="text-xs text-dim underline hover:text-muted" @click="reset">reset</button>
        <span class="ml-auto font-display text-xs text-dim">{{ filtered.length }} FOUND</span>
      </div>

      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="v in GAME_ORDER" :key="v"
          class="rounded-lg border px-2.5 py-1 font-display text-xs tracking-wider transition-all"
          :class="game === v ? 'text-bg' : 'border-line text-muted hover:border-line2 hover:text-ink'"
          :style="game === v ? { background: GAMES[v].color, borderColor: GAMES[v].color } : null"
          @click="game = game === v ? null : v"
        >{{ GAMES[v].label }}</button>
      </div>

      <div class="flex flex-wrap gap-1">
        <button
          v-for="t in TYPES" :key="t"
          class="rounded px-2 py-1 font-display text-[11px] uppercase tracking-wider transition-all"
          :style="{
            color: `var(--color-type-${t})`,
            background: selectedTypes.includes(t)
              ? `color-mix(in srgb, var(--color-type-${t}) 28%, transparent)`
              : 'transparent',
            boxShadow: selectedTypes.includes(t)
              ? `inset 0 0 0 1.5px var(--color-type-${t})`
              : `inset 0 0 0 1px color-mix(in srgb, var(--color-type-${t}) 28%, transparent)`,
            opacity: selectedTypes.length && !selectedTypes.includes(t) ? 0.5 : 1,
          }"
          @click="toggleType(t)"
        >{{ t }}</button>
      </div>
    </section>

    <!-- grid -->
    <PokeballSpinner v-if="!loaded" label="LOADING DEX…" />
    <div v-else-if="!filtered.length" class="rounded-2xl border border-dashed border-line py-20 text-center text-sm text-dim">
      Nothing matches those filters.
    </div>
    <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      <PokemonCard v-for="p in filtered" :key="p.id" :pokemon="p" />
    </div>
  </div>
</template>

<style scoped>
.shake {
  animation: shake 0.4s ease;
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  50% { transform: translateX(5px); }
  75% { transform: translateX(-3px); }
}
</style>
