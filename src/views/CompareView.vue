<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { loadPokemon, loadAbilities, loadIndex, spriteUrl } from '../lib/api'
import { TYPES, defenseProfile } from '../lib/typeChart'
import { dexNo, statTotal, STAT_ORDER, fmtMult, maxDexId } from '../lib/utils'
import { writeJSON } from '../lib/storage'
import TypeBadge from '../components/TypeBadge.vue'
import PokemonPicker from '../components/PokemonPicker.vue'
import PageHeader from '../components/ui/PageHeader.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import Skeleton from '../components/ui/Skeleton.vue'
import Icon from '../components/ui/Icon.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const mons = ref([])
const abilitydex = ref({})

// the highest valid id comes from the loaded index, not from a fixed dex size
const maxId = ref(0)
onMounted(async () => (maxId.value = maxDexId(await loadIndex())))

const ids = computed(() =>
  String(route.query.p ?? '')
    .split(',')
    .map(Number)
    .filter((n) => n >= 1 && n <= maxId.value)
    .slice(0, 3),
)

// the menu's COMPARE link reopens the last comparison of this tab (not while leaving: the route has changed by then)
watch(ids, (list) => {
  if (route.name === 'compare') writeJSON('last-query:compare', list.length ? { p: list.join(',') } : {}, 'session')
})

// Answers are applied only for the ids they were asked for: when the ids change while a load is running
// (a quick add / remove, Back), the late answer is dropped, so the page always shows what the URL asks for.
let request = 0
const loading = ref(false)
watch(
  ids,
  async (list) => {
    if (route.name !== 'compare') return // leaving the page: keep what is on screen
    const token = ++request
    loading.value = true
    try {
      const [abilities, loaded] = await Promise.all([loadAbilities(), Promise.all(list.map(loadPokemon))])
      if (token !== request) return
      abilitydex.value = abilities
      mons.value = loaded
    } finally {
      if (token === request) loading.value = false
    }
  },
  { immediate: true },
)

// the URL names contenders: placeholders, not "nothing to compare", until they are loaded
const asked = computed(() => Boolean(route.query.p))
const waiting = computed(() => !mons.value.length && asked.value && (!maxId.value || loading.value))

const setIds = (list) => router.replace({ query: list.length ? { p: list.join(',') } : {} })
const add = (id) => !ids.value.includes(id) && setIds([...ids.value, id])
const remove = (id) => setIds(ids.value.filter((x) => x !== id))

// one colour per contender slot, from the palette tokens
const COLORS = ['var(--color-dexglow)', 'var(--color-lens)', 'var(--color-good)']

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
    <PageHeader :title="t('compare.title')" :accent="t('compare.accent')">
      {{ t('compare.subtitle') }}
      <div v-if="ids.length < 3" class="mt-3 max-w-72">
        <PokemonPicker :exclude="ids" :placeholder="t('compare.add')" :label="t('compare.addLabel')" @pick="add" />
      </div>
    </PageHeader>

    <div v-if="waiting" aria-busy="true" class="grid gap-4 sm:grid-cols-3">
      <p class="sr-only">{{ t('common.loading') }}</p>
      <Skeleton v-for="i in 3" :key="i" :h="232" :rounded="16" />
    </div>

    <EmptyState v-else-if="!mons.length" :title="t('compare.empty')" :hint="t('compare.emptyHint')" />

    <template v-else>
      <!-- contenders -->
      <div class="grid gap-4" :class="mons.length === 1 ? 'sm:grid-cols-1' : mons.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'">
        <section
          v-for="(m, i) in mons" :key="m.id"
          class="animate-fadeup relative rounded-2xl border bg-surface-1 p-4 text-center"
          :style="{ borderColor: `color-mix(in srgb, ${COLORS[i]} 45%, var(--color-line))`, animationDelay: i * 60 + 'ms' }"
        >
          <button
            type="button"
            :aria-label="t('compare.remove', { name: m.label })"
            class="absolute right-1.5 top-1.5 grid size-9 place-items-center rounded-lg text-dim transition-colors duration-(--dur-1) hover:text-dexglow active:translate-y-px"
            @click="remove(m.id)"
          >
            <Icon name="close" />
          </button>
          <RouterLink :to="`/pokemon/${m.id}`" class="block">
            <img :src="spriteUrl(m.id, 'art')" alt="" class="mx-auto size-28 object-contain drop-shadow-lg" />
            <p class="num mt-1 text-sm" :style="{ color: COLORS[i] }">{{ dexNo(m.id) }}</p>
            <p class="font-display text-2xl text-ink">{{ m.label }}</p>
          </RouterLink>
          <div class="mt-1.5 flex justify-center gap-1"><TypeBadge v-for="ty in m.types" :key="ty" :type="ty" size="sm" /></div>
          <p class="mt-2 text-sm text-muted">{{ m.abilities.map((a) => abilitydex[a]?.label ?? a).join(' / ') }}</p>
          <p class="mt-1 text-xs text-dim tabular-nums">
            {{ t('stats.bst') }} <span class="num text-muted">{{ statTotal(m.stats) }}</span>
            · {{ t('compare.measures', { h: m.height, w: m.weight }) }}
          </p>
        </section>
      </div>

      <div class="mt-5 grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        <!-- radar: a picture of the bars next to it, so screen readers skip it -->
        <section class="animate-fadeup rounded-2xl border border-line bg-surface-1 p-5" style="animation-delay: 120ms">
          <h2 class="eyebrow">{{ t('compare.radar') }}</h2>
          <svg viewBox="-28 0 276 200" aria-hidden="true" class="mx-auto mt-2 w-full max-w-90">
            <polygon v-for="f in [1, 0.75, 0.5, 0.25]" :key="f" :points="ringPoints(f)" fill="none" stroke="var(--color-line)" stroke-width="1" />
            <line v-for="a in axes" :key="a.stat" :x1="CX" :y1="CY" :x2="CX + a.x * R" :y2="CY + a.y * R" stroke="var(--color-line)" stroke-width="1" />
            <polygon
              v-for="(m, i) in mons" :key="m.id"
              :points="monPoints(m)"
              :style="{ fill: `color-mix(in srgb, ${COLORS[i]} 16%, transparent)`, stroke: COLORS[i] }"
              stroke-width="1.8"
              stroke-linejoin="round"
            />
            <text
              v-for="a in axes" :key="'t' + a.stat"
              :x="CX + a.x * (R + 16)" :y="CY + a.y * (R + 16) + 3"
              text-anchor="middle" fill="var(--color-muted)"
              style="font-family: var(--font-body); font-size: 10.5px; font-weight: 600; letter-spacing: 0.06em"
            >{{ t(`stats.${a.stat}`).toUpperCase() }}</text>
          </svg>
        </section>

        <!-- stat bars -->
        <section class="animate-fadeup rounded-2xl border border-line bg-surface-1 p-5" style="animation-delay: 160ms">
          <h2 class="eyebrow">{{ t('compare.baseStats') }}</h2>
          <div class="mt-4 space-y-3.5">
            <div v-for="s in STAT_ORDER" :key="s">
              <p class="mb-1 text-xs font-semibold text-muted">{{ t(`stats.${s}`) }}</p>
              <div class="space-y-1">
                <div v-for="(m, i) in mons" :key="m.id" class="flex items-center gap-2">
                  <span class="num w-8 text-right text-sm" :class="m.stats[s] === statMax(s) && mons.length > 1 ? 'text-ink' : 'text-dim'">{{ m.stats[s] }}</span>
                  <div aria-hidden="true" class="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
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
      <section class="animate-fadeup mt-5 rounded-2xl border border-line bg-surface-1 p-5" style="animation-delay: 200ms">
        <h2 class="eyebrow">{{ t('compare.damageTaken') }}</h2>
        <div class="scrollbar-thin mt-3 overflow-x-auto">
          <table class="w-full min-w-130 text-sm">
            <thead>
              <tr class="border-b border-line text-left">
                <th scope="col" class="eyebrow py-2 pr-3">{{ t('compare.vs') }}</th>
                <th v-for="(m, i) in mons" :key="m.id" scope="col" class="py-2 pr-3 font-display text-base font-normal uppercase" :style="{ color: COLORS[i] }">{{ m.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ty in TYPES" :key="ty" class="border-b border-line/40">
                <th scope="row" class="py-2 pr-3 text-left font-normal"><TypeBadge :type="ty" size="sm" /></th>
                <td v-for="(m, i) in mons" :key="m.id" class="py-2 pr-3">
                  <span
                    class="num inline-block rounded px-1.5 py-0.5 text-base"
                    :class="profiles[i][ty] > 1 ? 'bg-bad/12 text-bad' : profiles[i][ty] === 0 ? 'bg-immune/12 text-immune' : profiles[i][ty] < 1 ? 'bg-good/12 text-good' : 'text-dim'"
                  >×{{ fmtMult(profiles[i][ty]) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>
