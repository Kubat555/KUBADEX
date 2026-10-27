<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { usePrefsStore } from '../stores/prefs'
import { loadPokemon, loadMoves, loadAbilities, loadIndex, spriteUrl, cryUrl } from '../lib/api'
import { matchupBuckets } from '../lib/typeChart'
import { obtainHints, ancestorIds } from '../lib/obtain'
import { GAMES, GAME_ORDER, METHOD_ICON_NAMES } from '../data/games'
import { SPECIAL_ENCOUNTERS } from '../data/specialEncounters'
import { dexNo, statTotal, STAT_ORDER, maxDexId } from '../lib/utils'
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
import EmptyState from '../components/ui/EmptyState.vue'
import Icon from '../components/ui/Icon.vue'
import Segmented from '../components/ui/Segmented.vue'
import SpriteImg from '../components/ui/SpriteImg.vue'
import NotFoundView from './NotFoundView.vue'

const route = useRoute()
const router = useRouter()
const { t, te, locale } = useI18n()
const prefs = usePrefsStore()
const { version } = storeToRefs(prefs) // one game version, applied to every section

// ?game= (an entry opened from a game-filtered Pokédex, a shared link) becomes the global game
watch(() => route.query.game, (raw) => {
  const game = Array.isArray(raw) ? raw[0] : raw
  if (route.name === 'pokemon' && Object.hasOwn(GAMES, game)) version.value = game
}, { immediate: true })

// a game tab puts the game in the URL and makes it the global game
function pickGame(game) {
  version.value = game
  router.replace({ query: { ...route.query, game } })
}

// --- loading ---
// The entry on screen stays (dimmed, aria-busy) while the next one loads. Every load gets a number and only the
// latest one may write, so flipping fast with ←/→ always ends on the entry the URL names, whatever order the answers come in.
const p = ref(null)
const movedex = ref(null)
const abilitydex = ref(null)
const maxId = ref(0) // the last entry comes from the loaded index, not from a fixed dex size
const loading = ref(false)
const failed = ref(false)
const notFound = ref(false)
let lastRequest = 0

const requestedId = computed(() => Number(route.params.id))

async function load(id, { retry = false } = {}) {
  const request = ++lastRequest
  loading.value = true
  notFound.value = false
  if (!retry) failed.value = false // a retry keeps the error screen (its button busy) until the answer comes
  try {
    const entry = Promise.all([loadPokemon(id), loadMoves(), loadAbilities()])
    entry.catch(() => {}) // a number past the end has no file: the index below makes that a 404, not a load error
    const max = maxDexId(await loadIndex())
    if (request !== lastRequest) return
    maxId.value = max
    if (id < 1 || id > max) {
      notFound.value = true
      failed.value = false
      return
    }
    const [detail, moves, abilities] = await entry
    if (request !== lastRequest) return
    movedex.value = moves
    abilitydex.value = abilities
    p.value = detail
    failed.value = false
  } catch {
    if (request === lastRequest) failed.value = true
  } finally {
    if (request === lastRequest) loading.value = false
  }
}

watch(() => route.params.id, (id) => id && load(Number(id)), { immediate: true })
const retry = () => load(requestedId.value, { retry: true })

// "<Name> — KUBADEX" (the route has no titleKey); the number stands in while the entry loads
const pageTitle = computed(() => {
  if (notFound.value) return t('errors.notFound')
  if (failed.value) return t('errors.loadFailed')
  return p.value?.id === requestedId.value ? p.value.label : dexNo(requestedId.value)
})
watch(pageTitle, (title) => {
  if (route.name === 'pokemon') document.title = `${title} — KUBADEX` // not while leaving for another page
}, { immediate: true })

const num = computed(() => new Intl.NumberFormat(locale.value))
const percent = computed(() => new Intl.NumberFormat(locale.value, { style: 'percent', maximumFractionDigits: 1 }))

// game sprite follows the chosen version (manual toggle still available)
const sprite = ref('gen3')
watch([version, p], () => {
  if (!p.value) return
  sprite.value = GAMES[version.value].vg === 'firered-leafgreen' && p.value.hasFrlgSprite ? 'frlg' : 'gen3'
}, { immediate: true })

const spriteOptions = computed(() => {
  if (!p.value) return []
  const out = [{ value: 'gen3', label: 'Emerald' }]
  if (p.value.hasFrlgSprite) out.push({ value: 'frlg', label: 'FR·LG' })
  out.push({ value: 'shiny', label: t('pokemon.shiny') })
  return out
})

const specialFor = (id, v) => (SPECIAL_ENCOUNTERS[id] ?? []).filter((s) => s.games === 'all' || s.games.includes(v))

const MATCHUP_ROWS = [[4, 'weak'], [2, 'weak'], [0.5, 'resist'], [0.25, 'resist'], [0, 'immune']]
const MATCHUP_COLOR = { weak: 'text-bad', resist: 'text-good', immune: 'text-immune' }
const buckets = computed(() => (p.value ? matchupBuckets(p.value.types) : null))
const bucketRows = computed(() =>
  MATCHUP_ROWS.map(([m, kind]) => ({ m, kind, types: buckets.value?.[m] ?? [] })).filter((r) => r.types.length),
)

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

const methodLabel = (m) => (te(`methods.${m}`) ? t(`methods.${m}`) : m)
const fmtMethod = (m) => {
  const lv = m.max !== m.min ? `${m.min}–${m.max}` : m.min
  return `${methodLabel(m.method)} · ${t('pokemon.where.level', { lv })} · ${percent.value.format(m.chance / 100)}`
}

const highlights = computed(() => {
  const out = {}
  for (const e of encList.value) {
    if (e.region !== region.value) continue
    const slug = mapSlugIndex.value.get(e.loc)
    if (!slug) continue
    out[slug] ??= { color: GAMES[version.value].color, lines: [] }
    out[slug].lines.push(...e.methods.map((m) => ({ icon: METHOD_ICON_NAMES[m.method], text: fmtMethod(m) })))
  }
  return out
})

const offMapEncounters = computed(() =>
  encList.value.filter((e) => e.region !== region.value || !mapSlugIndex.value.get(e.loc)),
)

const versionsWithData = computed(() =>
  p.value ? GAME_ORDER.filter((v) => p.value.encounters[v]?.length || specialFor(p.value.id, v).length) : [],
)

// --- how to get it when it is not wild in this game ---
// Pre-evolutions (nearest first) are fetched only when the entry has no encounter and no note of its own here.
const ancestors = ref(null) // { id, list }: `id` is the entry they belong to
const needsAncestors = computed(() => !!p.value && !encList.value.length && !specialNotes.value.length)
watch([p, needsAncestors], async ([detail, need]) => {
  if (!need || ancestors.value?.id === detail.id) return
  try {
    const list = await Promise.all(ancestorIds(detail.evolution, detail.id).map(loadPokemon))
    if (p.value === detail) ancestors.value = { id: detail.id, list }
  } catch {
    // no hints for this entry then; "not found in the wild" still shows, and the page itself is fine
  }
}, { immediate: true })

// null while the pre-evolutions load
const hints = computed(() => {
  if (!p.value) return []
  const list = ancestors.value?.id === p.value.id ? ancestors.value.list : null
  if (needsAncestors.value && !list) return null
  return obtainHints({ p: p.value, version: version.value, ancestors: list ?? [], specialFor })
})

// --- previous / next: from the requested number, so a held arrow key keeps going while entries load ---
const prevId = computed(() => (!notFound.value && requestedId.value > 1 ? requestedId.value - 1 : null))
const nextId = computed(() => (!notFound.value && requestedId.value < maxId.value ? requestedId.value + 1 : null))

// ← / → flip between entries — not with a modifier (browser shortcuts), nor while typing, nor when a control used the key
function onArrows(e) {
  if (e.altKey || e.metaKey || e.ctrlKey || e.shiftKey || e.defaultPrevented || e.isComposing) return
  const el = document.activeElement
  if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return
  const to = e.key === 'ArrowLeft' ? prevId.value : e.key === 'ArrowRight' ? nextId.value : null
  if (to) router.push(`/pokemon/${to}`)
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
  <NotFoundView v-if="notFound" :hint="t('errors.pokemonNotFound', { n: dexNo(requestedId), max: dexNo(maxId) })" />

  <div v-else class="space-y-5">
    <!-- prev / next -->
    <nav v-if="p || failed" :aria-label="t('pokemon.siblings')" class="flex items-center justify-between">
      <RouterLink
        v-if="prevId" :to="`/pokemon/${prevId}`" :aria-label="t('pokemon.prev', { n: dexNo(prevId) })"
        class="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm text-muted transition-colors duration-(--dur-1) hover:text-ink"
      ><Icon name="arrow-left" /><span class="num">{{ dexNo(prevId) }}</span></RouterLink>
      <span v-else></span>
      <RouterLink
        v-if="nextId" :to="`/pokemon/${nextId}`" :aria-label="t('pokemon.next', { n: dexNo(nextId) })"
        class="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm text-muted transition-colors duration-(--dur-1) hover:text-ink"
      ><span class="num">{{ dexNo(nextId) }}</span><Icon name="arrow-right" /></RouterLink>
    </nav>

    <EmptyState v-if="failed" :title="t('errors.loadFailed')" :hint="t('errors.loadFailedHint')">
      <template #actions>
        <button
          type="button"
          :disabled="loading"
          :aria-busy="loading"
          class="inline-flex h-10 items-center rounded-lg border border-line-strong bg-surface-2 px-4 font-display text-sm uppercase tracking-wider text-ink transition-colors duration-(--dur-1) hover:border-dexglow active:translate-y-px disabled:opacity-60"
          @click="retry"
        >{{ t('common.retry') }}</button>
      </template>
    </EmptyState>

    <PokeballSpinner v-else-if="!p" :label="t('pokemon.opening')" />

    <!-- dimmed (after a short delay, so a quick load does not flicker) while the next entry loads -->
    <div v-else class="space-y-5 transition-opacity duration-(--dur-2)" :class="loading ? 'opacity-50 delay-150' : ''" :aria-busy="loading">
      <!-- HERO -->
      <section
        class="animate-fadeup relative overflow-hidden rounded-2xl border border-line bg-surface-1 p-6 sm:p-8"
        :style="{ '--t': `var(--color-type-${p.types[0]})` }"
      >
        <!-- type band along the top edge, one segment per type -->
        <div aria-hidden="true" class="absolute inset-x-0 top-0 flex h-1">
          <span v-for="ty in p.types" :key="ty" class="flex-1" :style="{ background: `var(--color-type-${ty})` }"></span>
        </div>
        <!-- the dex number as a graphic: big pixel digits in the type colour with a hard pixel shadow -->
        <div
          aria-hidden="true"
          class="pointer-events-none absolute top-5 right-5 hidden select-none font-display text-6xl leading-none sm:block lg:top-7 lg:right-8 lg:text-8xl"
          :style="{ color: 'color-mix(in srgb, var(--t) 30%, transparent)', textShadow: '4px 4px 0 color-mix(in srgb, var(--t) 12%, transparent)' }"
        >{{ dexNo(p.id) }}</div>

        <div class="relative grid gap-6 lg:grid-cols-[280px_1fr]">
          <!-- artwork, game sprite, cry -->
          <div class="flex flex-col items-center">
            <img :src="spriteUrl(p.id, 'art')" :alt="p.label" class="size-56 object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.5)]" />
            <div class="mt-3 flex flex-col items-center gap-2 rounded-xl border border-line bg-bg/40 p-2">
              <SpriteImg
                :src="spriteUrl(p.id, sprite)" :alt="t('pokemon.spriteAlt', { name: p.label })" :w="64" loading="eager"
                :class="crying ? 'animate-marker' : ''"
              />
              <Segmented v-model="sprite" :options="spriteOptions" :label="t('pokemon.spriteLabel')" size="sm" />
            </div>
            <button
              type="button"
              class="mt-2 inline-flex h-8 items-center gap-2 rounded-lg border px-3 font-display text-sm uppercase tracking-wider transition-colors duration-(--dur-1) active:translate-y-px"
              :class="crying ? 'border-dex bg-dex/15 text-dexglow' : 'border-line-strong text-muted hover:border-dexglow hover:text-ink'"
              @click="playCry"
            ><Icon name="sound" />{{ t('pokemon.cry') }}</button>
          </div>

          <!-- identity + flavor -->
          <div class="min-w-0">
            <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 class="font-display text-4xl text-balance text-ink">{{ p.label }}</h1>
              <span class="text-sm text-muted">{{ p.genus }}</span>
            </div>
            <div class="mt-2 flex flex-wrap items-center gap-2">
              <TypeBadge v-for="ty in p.types" :key="ty" :type="ty" />
              <span class="ml-2 text-xs text-dim">
                {{ t('pokemon.national') }} <span class="num text-muted">{{ dexNo(p.dex.national) }}</span>
                <template v-if="p.dex.kanto"> · {{ t('pokemon.region.kanto') }} <span class="num text-muted">{{ dexNo(p.dex.kanto) }}</span></template>
                <template v-if="p.dex.hoenn"> · {{ t('pokemon.region.hoenn') }} <span class="num text-muted">{{ dexNo(p.dex.hoenn) }}</span></template>
              </span>
            </div>

            <!-- game version: one switch for dex entry, sprite, encounters and moves -->
            <div class="mt-5">
              <p class="eyebrow mb-1.5">{{ t('pokemon.gameScope') }}</p>
              <GameTabs :model-value="version" :active="versionsWithData" @update:model-value="pickGame" />
              <p class="mt-3 max-w-xl border-l-2 pl-4 text-sm leading-relaxed text-muted" :style="{ borderColor: GAMES[flavorVersion]?.color }">
                {{ flavorText }}
                <span v-if="flavorVersion && flavorVersion !== version" class="mt-1 block text-[11px] text-dim">
                  {{ t('pokemon.flavorFallback', { game: GAMES[version].label, from: GAMES[flavorVersion]?.label }) }}
                </span>
              </p>
            </div>

            <dl class="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <div><dt class="eyebrow">{{ t('pokemon.height') }}</dt><dd class="num mt-0.5 text-ink">{{ t('pokemon.metres', { n: num.format(p.height) }) }}</dd></div>
              <div><dt class="eyebrow">{{ t('pokemon.weight') }}</dt><dd class="num mt-0.5 text-ink">{{ t('pokemon.kilograms', { n: num.format(p.weight) }) }}</dd></div>
              <div>
                <dt class="eyebrow">{{ t('pokemon.abilities', p.abilities.length) }}</dt>
                <dd class="mt-0.5 text-ink">{{ p.abilities.map((a) => abilitydex[a]?.label ?? a).join(' / ') }}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <!-- STATS + MATCHUPS + ABILITIES -->
      <div class="grid gap-5 lg:grid-cols-2">
        <section class="animate-fadeup rounded-2xl border border-line bg-surface-1 p-5" style="animation-delay: 60ms">
          <h2 class="eyebrow">{{ t('pokemon.sections.stats') }}</h2>
          <div class="mt-4 space-y-2.5">
            <StatBar v-for="s in STAT_ORDER" :key="s" :label="t(`stats.${s}`)" :value="p.stats[s]" />
            <div class="flex items-center gap-3 border-t border-line pt-2.5">
              <span class="w-20 shrink-0 text-right text-xs font-semibold text-ink">{{ t('pokemon.total') }}</span>
              <span class="num text-sm text-dexglow">{{ statTotal(p.stats) }}</span>
            </div>
          </div>
        </section>

        <div class="space-y-5">
          <section class="animate-fadeup rounded-2xl border border-line bg-surface-1 p-5" style="animation-delay: 100ms">
            <h2 class="eyebrow">{{ t('pokemon.sections.matchups') }}</h2>
            <div v-if="bucketRows.length" class="mt-4 grid grid-cols-[max-content_1fr] items-start gap-x-3 gap-y-2.5">
              <template v-for="row in bucketRows" :key="row.m">
                <span class="pt-0.5 text-right text-xs font-semibold uppercase tracking-wider" :class="MATCHUP_COLOR[row.kind]">
                  {{ t(`pokemon.matchups.${row.kind}`) }} ×{{ num.format(row.m) }}
                </span>
                <div class="flex flex-wrap gap-1">
                  <TypeBadge v-for="ty in row.types" :key="ty" :type="ty" size="sm" />
                </div>
              </template>
            </div>
            <p v-else class="mt-4 text-sm text-dim">{{ t('pokemon.matchups.neutral') }}</p>
          </section>

          <section class="animate-fadeup rounded-2xl border border-line bg-surface-1 p-5" style="animation-delay: 140ms">
            <h2 class="eyebrow">{{ t('pokemon.abilities', p.abilities.length) }}</h2>
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
      <section v-if="p.evolution && (p.evolution.evolvesTo.length || p.evolution.id !== p.id)" class="animate-fadeup rounded-2xl border border-line bg-surface-1 p-5" style="animation-delay: 160ms">
        <h2 class="eyebrow">{{ t('pokemon.sections.evolution') }}</h2>
        <div class="scrollbar-thin mt-4 overflow-x-auto pb-1">
          <EvolutionTree :node="p.evolution" :current-id="p.id" />
        </div>
      </section>

      <!-- ENCOUNTERS -->
      <section class="animate-fadeup rounded-2xl border border-line bg-surface-1 p-5" style="animation-delay: 200ms">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="eyebrow">{{ t('pokemon.sections.where') }}</h2>
          <span class="inline-flex items-center gap-2 font-display text-sm uppercase tracking-wider text-ink">
            <span aria-hidden="true" class="size-2" :style="{ background: GAMES[version].color }"></span>{{ GAMES[version].label }}
          </span>
        </div>

        <!-- nothing of its own here: how to get it instead (evolve, trade, or nothing known) -->
        <div v-if="!encList.length && !specialNotes.length" class="mt-5 space-y-3 rounded-xl border border-dashed border-line p-6 text-center sm:p-8">
          <p class="text-sm text-ink">{{ t('pokemon.where.notWild', { game: GAMES[version].label }) }}</p>
          <template v-for="h in hints ?? []" :key="h.kind">
            <i18n-t v-if="h.kind === 'evolve'" keypath="pokemon.where.evolve" tag="p" scope="global" class="text-sm text-muted text-pretty">
              <template #name>
                <RouterLink
                  :to="`/pokemon/${h.fromId}`"
                  class="font-semibold text-ink underline decoration-line-strong underline-offset-2 transition-colors duration-(--dur-1) hover:decoration-dexglow"
                >{{ h.fromLabel }}</RouterLink>
              </template>
              <template #game>{{ GAMES[version].label }}</template>
            </i18n-t>
            <div v-else-if="h.kind === 'trade'" class="space-y-2">
              <p class="text-sm text-muted text-pretty">{{ t('pokemon.where.trade') }}</p>
              <div class="flex flex-wrap justify-center gap-1.5">
                <button
                  v-for="v in h.versions" :key="v"
                  type="button"
                  class="inline-flex h-8 items-center gap-2 rounded-lg border border-line-strong px-3 font-display text-sm tracking-wider text-muted transition-colors duration-(--dur-1) hover:text-ink active:translate-y-px"
                  @click="pickGame(v)"
                ><span aria-hidden="true" class="size-2" :style="{ background: GAMES[v].color }"></span>{{ GAMES[v].label }}</button>
              </div>
            </div>
            <p v-else-if="h.kind === 'none'" class="mx-auto max-w-xl text-sm text-muted text-pretty">{{ t('pokemon.where.none') }}</p>
          </template>
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
              <span class="text-xs font-semibold uppercase tracking-wider text-lens">{{ t('pokemon.where.special') }}</span>
              <p class="mt-0.5 text-muted">{{ s.note }}</p>
            </div>

            <div
              v-for="e in encList" :key="e.loc"
              class="rounded-lg border border-line bg-panel p-3"
            >
              <p class="text-sm font-semibold text-ink">
                {{ e.label }}
                <span v-if="e.region !== region" class="ml-1 text-xs font-medium text-dim">({{ t(`pokemon.region.${e.region}`) }})</span>
              </p>
              <ul class="mt-1 space-y-0.5">
                <li v-for="m in e.methods" :key="m.method" class="flex items-center gap-1 text-xs text-muted">
                  <Icon v-if="METHOD_ICON_NAMES[m.method]" :name="METHOD_ICON_NAMES[m.method]" class="text-dim" />
                  {{ fmtMethod(m) }}
                </li>
              </ul>
            </div>
          </div>
        </div>
        <p v-if="offMapEncounters.length && encList.length" class="mt-2 text-[11px] text-dim">
          {{ t('pokemon.where.offMap', { map: t(`pokemon.region.${region}`) }) }}
        </p>
      </section>

      <!-- MOVES -->
      <section class="animate-fadeup rounded-2xl border border-line bg-surface-1 p-5" style="animation-delay: 240ms">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 class="eyebrow">{{ t('pokemon.sections.moves') }}</h2>
          <span class="inline-flex items-center gap-2 font-display text-sm uppercase tracking-wider text-ink">
            <span aria-hidden="true" class="size-2" :style="{ background: GAMES[version].color }"></span>{{ GAMES[version].label }}
          </span>
        </div>
        <MovesTable :moves="p.moves" :movedex="movedex" :version-group="GAMES[version].vg" />
      </section>

      <!-- TRAINING / BREEDING -->
      <section class="animate-fadeup rounded-2xl border border-line bg-surface-1 p-5" style="animation-delay: 280ms">
        <h2 class="eyebrow">{{ t('pokemon.sections.training') }}</h2>
        <dl class="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-4">
          <div>
            <dt class="eyebrow">{{ t('pokemon.training.catchRate') }}</dt>
            <dd class="mt-0.5 text-ink"><span class="num">{{ p.training.catchRate }}</span> <span class="text-xs text-dim">/ 255</span></dd>
          </div>
          <div><dt class="eyebrow">{{ t('pokemon.training.baseExp') }}</dt><dd class="num mt-0.5 text-ink">{{ p.baseExp ?? '—' }}</dd></div>
          <div><dt class="eyebrow">{{ t('pokemon.training.growth') }}</dt><dd class="mt-0.5 text-ink">{{ p.training.growthRate }}</dd></div>
          <div><dt class="eyebrow">{{ t('pokemon.training.happiness') }}</dt><dd class="num mt-0.5 text-ink">{{ p.training.baseHappiness }}</dd></div>
          <div>
            <dt class="eyebrow">{{ t('pokemon.training.evYield') }}</dt>
            <dd class="mt-0.5 text-ink">{{ Object.entries(p.training.evYield).map(([k, v]) => `${v} ${t(`stats.${k}`)}`).join(', ') || '—' }}</dd>
          </div>
          <div>
            <dt class="eyebrow">{{ t('pokemon.training.gender') }}</dt>
            <dd class="mt-0.5 flex flex-wrap gap-x-3 text-ink">
              <template v-if="p.training.genderFemale === null">{{ t('pokemon.training.genderless') }}</template>
              <template v-else>
                <span class="text-spec">{{ t('pokemon.training.male') }} <span class="num">{{ percent.format((100 - p.training.genderFemale) / 100) }}</span></span>
                <span class="text-type-psychic">{{ t('pokemon.training.female') }} <span class="num">{{ percent.format(p.training.genderFemale / 100) }}</span></span>
              </template>
            </dd>
          </div>
          <div><dt class="eyebrow">{{ t('pokemon.training.eggGroups') }}</dt><dd class="mt-0.5 text-ink">{{ p.training.eggGroups.join(', ') || '—' }}</dd></div>
          <div><dt class="eyebrow">{{ t('pokemon.training.hatchSteps') }}</dt><dd class="num mt-0.5 text-ink">~{{ num.format(p.training.hatchSteps) }}</dd></div>
        </dl>

        <div class="mt-6 border-t border-line pt-5">
          <h3 class="mb-4 text-sm font-semibold text-ink">{{ t('pokemon.sections.catch') }}</h3>
          <CatchCalculator :catch-rate="p.training.catchRate" :types="p.types" />
        </div>
      </section>
    </div>
  </div>
</template>
