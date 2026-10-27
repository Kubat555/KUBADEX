<script setup>
import { ref, computed, watch, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { loadIndex, spriteUrl, cryUrl } from '../lib/api'
import { TYPES } from '../lib/typeChart'
import { GAMES, GAME_ORDER } from '../data/games'
import { statTotal } from '../lib/utils'
import { serializeQuery } from '../lib/queryState'
import { readJSON, writeJSON } from '../lib/storage'
import { normalize, isGuessCorrect, searchPokemon } from '../lib/search'
import { useQueryState } from '../composables/useQueryState'
import { usePrefsStore } from '../stores/prefs'
import PokemonCard from '../components/PokemonCard.vue'
import PokeballSpinner from '../components/PokeballSpinner.vue'
import TypeBadge from '../components/TypeBadge.vue'
import Chip from '../components/ui/Chip.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import Icon from '../components/ui/Icon.vue'
import PageHeader from '../components/ui/PageHeader.vue'
import Segmented from '../components/ui/Segmented.vue'
import Sheet from '../components/ui/Sheet.vue'
import Skeleton from '../components/ui/Skeleton.vue'

const { t } = useI18n()

const index = ref([])
const loaded = ref(false)
onMounted(async () => {
  index.value = await loadIndex()
  loaded.value = true
})

// a random entry of the loaded index other than `except` (ids come from the data, not from a fixed dex size)
function randomId(except) {
  const pool = index.value.filter((p) => p.id !== except)
  return pool.length ? pool[Math.floor(Math.random() * pool.length)].id : null
}

const router = useRouter()
function goRandom() {
  const id = randomId()
  if (id) router.push(`/pokemon/${id}`)
}

// ---- Who's that Pokémon? — the daily pick first, then endless bonus rounds ----
// Today's result is saved per day (localStorage `wtp-daily`), the streak across days (`wtp-streak`), and the bonus
// round for the tab session (sessionStorage `wtp-bonus`): leaving an unfinished round and coming back continues it,
// so walking away from a hard one is no way around the streak.
const count = (v) => (Number.isInteger(v) && v > 0 ? v : 0)
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`

function readDaily(date) {
  const saved = readJSON('wtp-daily', null)
  if (saved?.date !== date) return { solved: false, gaveUp: false, misses: 0 }
  return { solved: saved.solved === true, gaveUp: saved.gaveUp === true, misses: count(saved.misses) }
}

function readBonus() {
  const b = readJSON('wtp-bonus', null, 'session')
  if (!count(b?.id) || !count(b?.round)) return null
  return { id: b.id, round: b.round, misses: count(b.misses), solved: b.solved === true, gaveUp: b.gaveUp === true }
}

const today = ref(new Date())
const dateKey = computed(() => dayKey(today.value))
const daily = ref(readDaily(dateKey.value)) // { solved, gaveUp, misses } of today's pick
const bonus = ref(readBonus()) // { id, round, misses, solved, gaveUp } or null
const streak = ref(count(readJSON('wtp-streak', 0)))

// the same pick for everyone on a given day
const dailyId = computed(() => {
  const n = index.value.length
  const d = today.value
  return n ? index.value[(d.getFullYear() * 372 + (d.getMonth() + 1) * 31 + d.getDate()) % n].id : null
})

function saveBonus(b) {
  bonus.value = b
  writeJSON('wtp-bonus', b, 'session')
}

// A bonus round only follows a revealed daily pick. One left from an earlier day gives way to the new day's pick.
function dropStaleBonus() {
  if (bonus.value && !daily.value.solved && !daily.value.gaveUp) saveBonus(null)
}
dropStaleBonus()

// a bonus round restored from the session must name a real entry, or the quiz would stay hidden
watch(index, (list) => {
  if (bonus.value && !list.some((p) => p.id === bonus.value.id)) saveBonus(null)
})

const guess = ref('')
const wrongShake = ref(0) // increments to retrigger the shake animation
const guessMsg = ref('') // i18n key of the answer to the last wrong guess, so it follows a language switch

function clearGuess() {
  guess.value = ''
  guessMsg.value = ''
  wrongShake.value = 0
}

// KeepAlive keeps this page: shown again on a later day, it moves on to that day's pick
onActivated(() => {
  const now = new Date()
  if (dayKey(now) === dateKey.value) return
  today.value = now
  daily.value = readDaily(dateKey.value)
  dropStaleBonus()
  clearGuess()
})

// the round on screen: the bonus round when there is one, else today's pick
const puzzle = computed(() => bonus.value ?? { id: dailyId.value, ...daily.value })
const featured = computed(() => index.value.find((p) => p.id === puzzle.value.id))
const solved = computed(() => puzzle.value.solved)
const gaveUp = computed(() => puzzle.value.gaveUp)
const misses = computed(() => puzzle.value.misses)
const revealed = computed(() => solved.value || gaveUp.value)

function updatePuzzle(patch) {
  if (bonus.value) {
    saveBonus({ ...bonus.value, ...patch })
  } else {
    daily.value = { ...daily.value, ...patch }
    writeJSON('wtp-daily', { date: dateKey.value, ...daily.value })
  }
}

function setStreak(n) {
  streak.value = n
  writeJSON('wtp-streak', n)
}

function submitGuess() {
  if (!normalize(guess.value) || !featured.value) return
  if (isGuessCorrect(guess.value, featured.value)) {
    guessMsg.value = ''
    updatePuzzle({ solved: true })
    setStreak(streak.value + 1)
    playCry()
    return
  }
  const known = index.value.some((p) => isGuessCorrect(guess.value, p))
  guessMsg.value = known ? 'wtp.wrong' : 'wtp.unknown'
  updatePuzzle({ misses: misses.value + 1 })
  wrongShake.value++
  guess.value = ''
}

function giveUp() {
  guessMsg.value = ''
  updatePuzzle({ gaveUp: true })
  setStreak(0)
}

function playAgain() {
  const id = randomId(puzzle.value.id)
  if (!id) return
  saveBonus({ id, round: (bonus.value?.round ?? 0) + 1, misses: 0, solved: false, gaveUp: false })
  clearGuess()
}

const crying = ref(false)
function playCry() {
  const audio = new Audio(cryUrl(featured.value.id))
  crying.value = true
  audio.addEventListener('ended', () => (crying.value = false))
  audio.addEventListener('error', () => (crying.value = false))
  audio.play().catch(() => (crying.value = false))
}

// ---- filters ----
const SORTS = ['id', 'name', 'bst', 'hp', 'atk', 'def', 'spa', 'spd', 'spe']
const DEXES = ['national', 'kanto', 'hoenn']

// Filters live in the URL query (shareable, restored by Back); defaults are left out of it.
const POKEDEX_SCHEMA = {
  q: { kind: 'text', max: 40 },
  type: { kind: 'list', values: TYPES, max: 2, default: [] },
  game: { kind: 'enum', values: GAME_ORDER, default: null },
  dex: { kind: 'enum', values: DEXES, default: 'national' },
  sort: { kind: 'enum', values: SORTS, default: 'id' },
}
const { state: filters, set, reset } = useQueryState(POKEDEX_SCHEMA, { routeName: 'pokedex', sessionKey: 'last-query:pokedex' })
const prefs = usePrefsStore()

const SORT_KEYS = { id: 'pokedex.sortId', name: 'pokedex.sortName', bst: 'stats.total' } // the base stats use `stats.<id>`
const sortLabel = (s) => t(SORT_KEYS[s] ?? `stats.${s}`)
const dexOptions = computed(() => DEXES.map((d) => ({ value: d, label: t(`pokedex.dexes.${d}`) })))
// type names as text: the `-ink` variant where the type colour itself is under 4.5:1 on the dark panel
const typeInk = (type) => `var(--color-type-${type}-ink, var(--color-type-${type}))`

// The field keeps exactly what is typed (spaces included); the trimmed text filters at once and reaches the URL later.
const searchText = ref(filters.value.q)
watch(searchText, (text) => { if (text.trim() !== filters.value.q) set({ q: text }) })
watch(() => filters.value.q, (q) => { if (q !== searchText.value.trim()) searchText.value = q })

// two types at most: picking a third drops the oldest
function toggleType(type) {
  const types = filters.value.type
  set({ type: types.includes(type) ? types.filter((x) => x !== type) : [...types, type].slice(-2) })
}

// picking a game here also makes it the global game of every other page
function toggleGame(v) {
  const game = filters.value.game === v ? null : v
  set({ game })
  if (game) prefs.version = game
}

// A typed query ranks the matches (best first, typos allowed) and the chosen sort waits until the field is empty;
// the dex, game and type filters narrow either list.
const filtered = computed(() => {
  const { q, type, game, dex, sort } = filters.value
  const keep = (p) =>
    (dex === 'national' || p.dex[dex]) && (!game || p.games.includes(game)) && type.every((x) => p.types.includes(x))
  if (normalize(q)) return searchPokemon(index.value, q, { limit: Infinity }).filter(keep)

  const list = index.value.filter(keep)
  if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name))
  else if (sort === 'bst') list.sort((a, b) => statTotal(b.stats) - statTotal(a.stats))
  else if (sort !== 'id') list.sort((a, b) => b.stats[sort] - a.stats[sort])
  else if (dex !== 'national') list.sort((a, b) => a.dex[dex] - b.dex[dex])
  return list
})

const hasFilters = computed(() => Object.keys(serializeQuery(filters.value, POKEDEX_SCHEMA)).length > 0)

// Everything set in the filter sheet (the search field stays in view), as removable chips under the search row
// on a phone; their number is on the button that opens the sheet.
const activeFilters = computed(() => {
  const { type, game, dex, sort } = filters.value
  const accent = 'var(--color-dexglow)'
  const list = type.map((x) => ({ key: `type-${x}`, label: t(`types.${x}`), color: `var(--color-type-${x})`, remove: () => toggleType(x) }))
  if (game) list.push({ key: 'game', label: GAMES[game].label, color: GAMES[game].color, remove: () => toggleGame(game) })
  if (dex !== POKEDEX_SCHEMA.dex.default) {
    list.push({ key: 'dex', label: t(`pokedex.dexes.${dex}`), color: accent, remove: () => set({ dex: POKEDEX_SCHEMA.dex.default }) })
  }
  if (sort !== POKEDEX_SCHEMA.sort.default) {
    const label = t('pokedex.sortChip', { name: sortLabel(sort) })
    list.push({ key: 'sort', label, color: accent, remove: () => set({ sort: POKEDEX_SCHEMA.sort.default }) })
  }
  return list
})

const sheetOpen = ref(false) // the filter sheet on a phone; wider screens show the filters in place
</script>

<template>
  <div>
    <!-- hero: one-line title and the Who's that Pokémon? screen: a compact full-width card under the title on a phone,
         under the intro at 640–767px, to the right of it (the intro narrows) from 768px -->
    <PageHeader
      :title="t('pokedex.title')"
      :accent="t('pokedex.accent')"
      class="max-sm:flex-col max-sm:flex-nowrap max-sm:items-stretch sm:items-center md:flex-nowrap"
    >
      <i18n-t keypath="pokedex.intro" tag="span" scope="global" class="hidden max-w-md text-pretty sm:block">
        <template #where>
          <RouterLink to="/map" class="text-lens underline decoration-line2 hover:text-ink">{{ t('pokedex.introWhere') }}</RouterLink>
        </template>
      </i18n-t>

      <template #actions>
        <div class="relative flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-line bg-bg p-3 shadow-[inset_0_2px_12px_rgb(0_0_0/0.55)] sm:gap-4">
          <!-- the streak sits in the screen's corner like a game HUD, so the caption next to the art stays one line -->
          <p
            v-if="streak >= 2"
            class="absolute top-2 left-2 z-10 inline-flex items-center gap-0.5 rounded bg-bg/85 px-1 text-type-electric"
            :title="t('wtp.streak', { n: streak })"
          >
            <Icon name="flame" />
            <span class="num text-xs" aria-hidden="true">×{{ streak }}</span>
            <span class="sr-only">{{ t('wtp.streak', { n: streak }) }}</span>
          </p>
          <component
            :is="featured && revealed ? 'router-link' : 'div'"
            :to="featured && revealed ? `/pokemon/${featured.id}` : undefined"
            :tabindex="featured && revealed ? -1 : undefined"
            class="group grid size-20 shrink-0 place-items-center sm:size-28"
          >
            <img
              v-if="featured"
              :src="spriteUrl(featured.id, 'art')"
              :alt="revealed ? featured.label : '???'"
              class="size-full object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.5)] transition-[scale,filter] duration-(--dur-4)"
              :class="revealed ? 'group-hover:scale-110' : 'brightness-0 invert'"
              draggable="false"
            />
            <Skeleton v-else :w="56" :h="56" rounded="50%" />
          </component>

          <!-- Fixed sizes keep the card from jumping between loading, quiz and answer: a phone gives the column
               the answer's height (88px, sprite 80px), wider screens a fixed width next to the 112px art. -->
          <div class="flex min-h-22 min-w-0 flex-1 flex-col justify-center sm:min-h-0 sm:w-56 sm:flex-none">
            <p
              class="font-display text-sm leading-5 uppercase tracking-wide"
              :class="!revealed ? 'text-lens' : solved ? 'text-good' : 'text-dim'"
            >{{ !revealed ? t('wtp.title') : solved ? t('wtp.solved') : t('wtp.gaveUp') }}</p>

            <!-- the index is still loading -->
            <Skeleton v-if="!featured" :h="40" :rounded="8" class="mt-1.5" />

            <!-- unsolved: the quiz -->
            <template v-else-if="!revealed">
              <form :key="wrongShake" class="mt-1.5 flex gap-1.5" :class="wrongShake ? 'shake' : ''" @submit.prevent="submitGuess">
                <input
                  v-model="guess"
                  type="text"
                  autocomplete="off"
                  :aria-label="t('wtp.guessLabel')"
                  :placeholder="t('wtp.placeholder')"
                  class="h-10 w-full min-w-0 rounded-lg border border-line-strong bg-surface-1 px-2.5 text-base text-ink placeholder:text-dim focus:border-lens sm:text-sm"
                />
                <button
                  type="submit"
                  class="h-10 shrink-0 rounded-lg border border-lens/50 px-3 font-display text-sm uppercase tracking-wider text-lens transition-colors duration-(--dur-1) hover:bg-lens/10 active:translate-y-px"
                >{{ t('wtp.submit') }}</button>
              </form>
              <p v-if="guessMsg" :key="`msg-${wrongShake}`" role="alert" class="mt-1 text-xs text-bad">{{ t(guessMsg) }}</p>
              <div v-if="misses >= 1" class="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
                <span class="eyebrow">{{ t('wtp.hint') }}</span>
                <TypeBadge v-for="type in featured.types" :key="type" :type="type" size="sm" />
                <span v-if="misses >= 2" class="truncate text-xs text-muted">{{ featured.genus }}</span>
              </div>
              <button
                v-if="misses >= 3"
                type="button"
                class="mt-1.5 self-start text-xs text-muted underline decoration-line2 hover:text-ink"
                @click="giveUp"
              >{{ t('wtp.giveUp') }}</button>
            </template>

            <!-- revealed -->
            <template v-else>
              <RouterLink
                :to="`/pokemon/${featured.id}`"
                class="block truncate font-display text-xl leading-7 text-ink transition-colors duration-(--dur-1) hover:text-dexglow"
              >{{ featured.label }}<span v-if="solved">!</span></RouterLink>
              <div class="mt-1 hidden min-w-0 items-center gap-1.5 sm:flex">
                <TypeBadge v-for="type in featured.types" :key="type" :type="type" size="sm" />
                <span class="truncate text-xs text-muted">{{ featured.genus }}</span>
              </div>
              <!-- a phone shows the cry button as the speaker icon alone, so both buttons fit one row from 360px -->
              <div class="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  class="inline-flex size-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border font-display text-sm uppercase tracking-wide transition-colors duration-(--dur-1) active:translate-y-px sm:w-auto sm:px-2.5"
                  :class="crying ? 'border-dex bg-dex/15 text-dexglow' : 'border-line-strong text-muted hover:border-dexglow hover:text-ink'"
                  @click="playCry"
                >
                  <Icon name="sound" /><span class="sr-only sm:not-sr-only">{{ t('wtp.cry') }}</span>
                </button>
                <button
                  type="button"
                  class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-lens/50 px-2.5 font-display text-sm uppercase tracking-wide whitespace-nowrap text-lens transition-colors duration-(--dur-1) hover:bg-lens/10 active:translate-y-px"
                  @click="playAgain"
                >
                  <Icon name="dice" />{{ t('wtp.playAgain') }}
                </button>
              </div>
            </template>
          </div>
        </div>
      </template>
    </PageHeader>

    <!-- filters: a panel on wider screens; on a phone the search row, a sheet with the rest and the active filters -->
    <section
      :aria-label="t('pokedex.filters')"
      class="animate-fadeup mb-4 sm:mb-6 sm:rounded-2xl sm:border sm:border-line sm:bg-surface-1 sm:p-4"
      style="animation-delay: 60ms"
    >
      <div class="flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-y-3">
        <div class="flex w-full gap-2 sm:contents">
          <input
            v-model="searchText"
            type="search"
            maxlength="40"
            :aria-label="t('pokedex.search')"
            :placeholder="t('pokedex.searchPlaceholder')"
            class="h-10 min-w-0 flex-1 rounded-lg border border-line-strong bg-surface-1 px-3 text-base text-ink placeholder:text-dim focus:border-lens sm:w-56 sm:flex-none sm:text-sm"
          />
          <button
            type="button"
            :title="t('pokedex.randomHint')"
            class="inline-flex h-10 min-w-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-line-strong font-display text-sm uppercase tracking-wider text-muted transition-colors duration-(--dur-1) hover:border-dexglow hover:text-ink active:translate-y-px sm:px-3"
            @click="goRandom"
          >
            <Icon name="dice" /><span class="sr-only sm:not-sr-only">{{ t('pokedex.random') }}</span>
          </button>
          <button
            type="button"
            aria-haspopup="dialog"
            :aria-expanded="sheetOpen"
            class="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-line-strong px-3 font-display text-sm uppercase tracking-wider text-ink transition-colors duration-(--dur-1) active:translate-y-px sm:hidden"
            @click="sheetOpen = true"
          >
            <Icon name="filter" />{{ t('pokedex.filters') }}
            <span v-if="activeFilters.length" class="num grid h-5 min-w-5 place-items-center rounded bg-dexglow px-1 text-xs text-bg">{{ activeFilters.length }}</span>
          </button>
        </div>

        <!-- wider screens: `contents` lays the controls into this row and the chip rows under it -->
        <Sheet :open="sheetOpen" :title="t('pokedex.filters')" :close-label="t('common.close')" class="contents" @close="sheetOpen = false">
          <div class="flex flex-col gap-5 pb-2 sm:contents">
            <div class="flex flex-col gap-2">
              <span aria-hidden="true" class="eyebrow sm:hidden">{{ t('pokedex.dex') }}</span>
              <Segmented
                :model-value="filters.dex"
                :options="dexOptions"
                :label="t('pokedex.dex')"
                class="w-full sm:w-auto"
                @update:model-value="(dex) => set({ dex })"
              />
            </div>

            <label class="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span class="eyebrow">{{ t('pokedex.sort') }}</span>
              <span class="relative">
                <select
                  :value="filters.sort"
                  class="h-10 w-full appearance-none rounded-lg border border-line-strong bg-surface-1 pr-9 pl-3 text-base text-ink focus:border-lens sm:w-auto sm:text-sm"
                  @change="set({ sort: $event.target.value })"
                >
                  <option v-for="s in SORTS" :key="s" :value="s">{{ sortLabel(s) }}</option>
                </select>
                <Icon name="chevron-down" class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted" />
              </span>
            </label>

            <fieldset class="min-w-0 sm:order-1 sm:basis-full">
              <legend class="eyebrow mb-2 sm:sr-only">{{ t('pokedex.game') }}</legend>
              <div class="flex flex-wrap gap-1.5">
                <Chip
                  v-for="v in GAME_ORDER"
                  :key="v"
                  :pressed="filters.game === v"
                  :color="GAMES[v].color"
                  @click="toggleGame(v)"
                >{{ GAMES[v].label }}</Chip>
              </div>
            </fieldset>

            <fieldset class="min-w-0 sm:order-2 sm:basis-full">
              <legend class="eyebrow mb-2 sm:sr-only">{{ t('pokedex.type') }}</legend>
              <div class="flex flex-wrap gap-1.5">
                <!-- pressed: the label turns `ink`, the type colours are under 4.5:1 on their own 24% tint -->
                <Chip
                  v-for="type in TYPES"
                  :key="type"
                  :pressed="filters.type.includes(type)"
                  :color="`var(--color-type-${type})`"
                  :style="filters.type.includes(type) ? null : { color: typeInk(type) }"
                  @click="toggleType(type)"
                >{{ t(`types.${type}`) }}</Chip>
              </div>
            </fieldset>
          </div>
        </Sheet>

        <div class="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:gap-3">
          <button
            v-for="f in activeFilters"
            :key="f.key"
            type="button"
            :aria-label="t('pokedex.removeFilter', { name: f.label })"
            class="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-(--chip) bg-[color-mix(in_srgb,var(--chip)_24%,transparent)] pr-1.5 pl-2.5 font-display text-sm leading-none uppercase tracking-wider whitespace-nowrap text-ink active:translate-y-px sm:hidden"
            :style="{ '--chip': f.color }"
            @click="f.remove()"
          >
            {{ f.label }}<Icon name="close" />
          </button>
          <button
            v-if="hasFilters"
            type="button"
            class="h-8 text-sm text-muted underline decoration-line2 transition-colors duration-(--dur-1) hover:text-ink"
            @click="reset"
          >{{ t('common.reset') }}</button>
          <span role="status" class="num ml-auto text-xs text-muted">{{ loaded ? t('pokedex.found', filtered.length) : '' }}</span>
        </div>
      </div>
    </section>

    <!-- grid -->
    <PokeballSpinner v-if="!loaded" />
    <EmptyState v-else-if="!filtered.length" :title="t('pokedex.empty')" :hint="t('pokedex.emptyHint')">
      <template #actions>
        <button
          type="button"
          class="h-10 rounded-lg border border-line-strong px-4 font-display text-sm uppercase tracking-wider text-ink transition-colors duration-(--dur-1) hover:border-dexglow active:translate-y-px"
          @click="reset"
        >{{ t('pokedex.resetFilters') }}</button>
      </template>
    </EmptyState>
    <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      <PokemonCard v-for="p in filtered" :key="p.id" :pokemon="p" :game="filters.game" />
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
