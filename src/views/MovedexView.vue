<script setup>
import { ref, computed, watch, onMounted, onActivated } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { usePrefsStore } from '../stores/prefs'
import { loadMoves, loadLearners, loadIndex, spriteUrl } from '../lib/api'
import { TYPES } from '../lib/typeChart'
import { GAMES } from '../data/games'
import { useQueryState } from '../composables/useQueryState'
import { CLASS_STYLE } from '../lib/moveClass'
import TypeBadge from '../components/TypeBadge.vue'
import GameTabs from '../components/GameTabs.vue'
import PageHeader from '../components/ui/PageHeader.vue'
import Chip from '../components/ui/Chip.vue'
import Sheet from '../components/ui/Sheet.vue'
import Skeleton from '../components/ui/Skeleton.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import SpriteImg from '../components/ui/SpriteImg.vue'

const { t } = useI18n()
const { version } = storeToRefs(usePrefsStore())
const vg = computed(() => GAMES[version.value].vg)

const movedex = ref(null)
const learners = ref(null)
const indexById = ref({})
const loading = ref(false)
const failed = ref(false) // the data could not be loaded: an error screen with a retry, not an endless skeleton

// a retry keeps the error screen (its button busy) until the answer comes; api.js never caches a failed request
async function load() {
  loading.value = true
  try {
    const [m, l, idx] = await Promise.all([loadMoves(), loadLearners(), loadIndex()])
    movedex.value = m
    learners.value = l
    indexById.value = Object.fromEntries(idx.map((p) => [p.id, p]))
    failed.value = false
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}
onMounted(load)

// Filters and the selected move live in the URL query (shareable, restored by Back); defaults are left out of it.
const MOVEDEX_SCHEMA = {
  q: { kind: 'text', max: 40 },
  type: { kind: 'enum', values: TYPES, default: null },
  class: { kind: 'enum', values: ['physical', 'special', 'status'], default: null },
  tm: { kind: 'bool' },
  move: { kind: 'text', max: 40 }, // the selected move
}
const { state: filters, set } = useQueryState(MOVEDEX_SCHEMA, { routeName: 'moves' })

// The field keeps exactly what is typed (spaces included); the trimmed text filters at once and reaches the URL later.
const searchText = ref(filters.value.q)
watch(searchText, (text) => { if (text.trim() !== filters.value.q) set({ q: text }) })
watch(() => filters.value.q, (q) => { if (q !== searchText.value.trim()) searchText.value = q })

// a click, not typing: the move goes to the URL at once, so Back from one of its learners finds it selected
const toggleMove = (name) => set({ move: filters.value.move === name ? '' : name }, { immediate: true })

// the filters only: the selected move stays in the side panel
const resetFilters = () => set({ q: '', type: null, class: null, tm: false })

// Phone: the learners panel is a bottom sheet, open while a move is selected, and closing it clears the selection.
// The sheet also closes when the screen grows past phone width: then the selection stays, for the side panel.
function onSheetClose() {
  if (window.matchMedia?.('(max-width: 639px)').matches ?? true) set({ move: '' }, { immediate: true })
}

// the selected move only when it is a real one: the URL is not trusted
const selected = computed(() => (movedex.value && Object.hasOwn(movedex.value, filters.value.move) ? filters.value.move : null))

const rows = computed(() => {
  if (!movedex.value) return []
  const { q: text, type, class: moveClass, tm: tmOnly } = filters.value
  const q = text.toLowerCase()
  return Object.entries(movedex.value)
    .map(([name, m]) => ({ name, ...m, tm: m.machines?.[vg.value] }))
    .filter((m) =>
      (!q || m.name.includes(q) || m.label.toLowerCase().includes(q)) &&
      (!type || m.type === type) &&
      (!moveClass || m.class === moveClass) &&
      (!tmOnly || m.tm),
    )
    .sort((a, b) => (tmOnly ? (a.tm > b.tm ? 1 : -1) : a.label.localeCompare(b.label)))
})

// learn methods in display order; their labels are `methods.<id>`
const METHOD_ORDER = ['level-up', 'machine', 'tutor', 'egg']

const panel = computed(() => {
  if (!selected.value || !learners.value) return null
  const move = movedex.value[selected.value]
  const entries = (learners.value[selected.value]?.[vg.value] ?? []).filter(([pid]) => indexById.value[pid])
  const groups = METHOD_ORDER.map((id) => ({
    id,
    mons: entries
      .filter(([, method]) => method === id)
      .map(([pid, , level]) => ({ ...indexById.value[pid], level }))
      .sort((a, b) => (id === 'level-up' ? a.level - b.level || a.id - b.id : a.id - b.id)),
  })).filter((g) => g.mons.length)
  // a Pokémon that learns the move several ways is one learner
  const total = new Set(entries.map(([pid]) => pid)).size
  return { name: selected.value, move, groups, total }
})

// On wider screens the learners list scrolls inside the sticky side panel. KeepAlive detaches the page while another
// one is shown, and a detached element loses its scroll offset, so the offset is tracked while scrolling (onDeactivated
// runs after the detach, too late to read it) and put back on return; another move starts at the top.
const listEl = ref(null)
let listScroll = 0
const onListScroll = (e) => (listScroll = e.target.scrollTop)
onActivated(() => {
  if (listEl.value) listEl.value.scrollTop = listScroll
})
watch(selected, () => {
  listScroll = 0
  if (listEl.value) listEl.value.scrollTop = 0
})
</script>

<template>
  <div>
    <PageHeader :title="t('moves.title')">
      {{ t('moves.subtitle') }}
      <template #actions><GameTabs v-model="version" /></template>
    </PageHeader>

    <section class="animate-fadeup mb-5 space-y-3 rounded-2xl border border-line bg-surface-1 p-4" style="animation-delay: 60ms">
      <div class="flex flex-wrap items-center gap-2">
        <input
          v-model="searchText"
          type="search"
          maxlength="40"
          :aria-label="t('moves.search')"
          :placeholder="t('moves.placeholder')"
          class="h-10 w-full rounded-lg border border-line-strong bg-bg px-3 text-base text-ink placeholder:text-dim sm:w-56 sm:text-sm"
        />
        <div role="group" :aria-label="t('moves.classFilter')" class="flex gap-1.5">
          <Chip
            v-for="(c, id) in CLASS_STYLE" :key="id"
            :pressed="filters.class === id"
            :color="c.color"
            @click="set({ class: filters.class === id ? null : id })"
          >{{ t(c.key) }}</Chip>
        </div>
        <Chip :pressed="filters.tm" @click="set({ tm: !filters.tm })">{{ t('moves.tmOnly') }}</Chip>
        <p v-if="movedex" role="status" class="ml-auto text-xs font-semibold uppercase tracking-wider text-dim tabular-nums">
          {{ t('moves.count', rows.length) }}
        </p>
      </div>
      <!-- phone: one row that scrolls sideways instead of five rows of chips above the table
           (the vertical padding keeps the focus outline inside the scroll box) -->
      <div
        role="group"
        :aria-label="t('moves.typeFilter')"
        class="scrollbar-thin -mx-4 -my-1 flex gap-1.5 overflow-x-auto px-4 py-1 sm:m-0 sm:flex-wrap sm:overflow-visible sm:p-0"
      >
        <Chip
          v-for="ty in TYPES" :key="ty"
          :pressed="filters.type === ty"
          :color="`var(--color-type-${ty})`"
          @click="set({ type: filters.type === ty ? null : ty })"
        >{{ t(`types.${ty}`) }}</Chip>
      </div>
    </section>

    <div class="grid items-start gap-5 sm:grid-cols-[minmax(0,1fr)_15rem] md:grid-cols-[minmax(0,1fr)_18rem] lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <!-- table: the page scrolls it (a scroll box of its own would lose its position under KeepAlive) -->
      <div class="min-w-0">
        <EmptyState v-if="failed" :title="t('errors.loadFailed')" :hint="t('errors.loadFailedHint')">
          <template #actions>
            <button
              type="button"
              :disabled="loading"
              :aria-busy="loading"
              class="inline-flex h-10 items-center rounded-lg border border-line-strong bg-surface-2 px-4 font-display text-base uppercase tracking-[1px] text-ink transition-colors duration-(--dur-1) hover:border-dexglow active:translate-y-px disabled:opacity-60"
              @click="load"
            >{{ t('common.retry') }}</button>
          </template>
        </EmptyState>

        <EmptyState v-else-if="movedex && !rows.length" :title="t('moves.empty')" :hint="t('moves.emptyHint')">
          <template #actions>
            <button
              type="button"
              class="h-10 rounded-lg border border-line-strong px-4 font-display text-base uppercase tracking-[1px] text-ink transition-colors duration-(--dur-1) hover:border-dexglow active:translate-y-px"
              @click="resetFilters"
            >{{ t('moves.resetFilters') }}</button>
          </template>
        </EmptyState>

        <section
          v-else
          class="animate-fadeup overflow-clip rounded-2xl border border-line bg-surface-1"
          style="animation-delay: 100ms"
          :aria-busy="!movedex"
        >
          <div v-if="!movedex" class="space-y-3 p-4">
            <p class="sr-only">{{ t('common.loading') }}</p>
            <Skeleton v-for="i in 12" :key="i" :h="20" />
          </div>

          <table v-else class="w-full border-separate border-spacing-0 text-sm">
            <!-- the column heads stay under the header while the page scrolls (the header is sticky from 640px) -->
            <thead>
              <tr class="text-left *:sticky *:top-0 *:z-10 *:border-b *:border-line *:bg-surface-1 *:py-2.5 sm:*:top-14">
                <th scope="col" class="eyebrow pl-3 pr-2 sm:pl-4 sm:pr-3">{{ t('moves.col.move') }}</th>
                <th scope="col" class="eyebrow pr-2 sm:pr-3">{{ t('moves.col.type') }}</th>
                <th scope="col" class="eyebrow pr-2 sm:pr-3">{{ t('moves.col.class') }}</th>
                <th scope="col" class="eyebrow pr-2 text-right sm:pr-3" :title="t('moves.power')">{{ t('moves.col.power') }}</th>
                <th scope="col" class="eyebrow pr-3 text-right max-md:hidden" :title="t('moves.accuracy')">{{ t('moves.col.accuracy') }}</th>
                <th scope="col" class="eyebrow pr-3 text-right sm:pr-4">{{ t('moves.col.tm') }}</th>
              </tr>
            </thead>
            <tbody>
              <!-- the move name is the row's button (Tab, Enter / Space); a click anywhere on the row does the same -->
              <tr
                v-for="m in rows" :key="m.name"
                class="cursor-pointer transition-colors duration-(--dur-1) *:border-b *:border-line/40 *:py-2"
                :class="selected === m.name ? 'bg-surface-2' : 'hover:bg-surface-2/50 focus-within:bg-surface-2/50'"
                @click="toggleMove(m.name)"
              >
                <td
                  class="pl-3 pr-2 sm:pl-4 sm:pr-3"
                  :class="selected === m.name ? 'shadow-[inset_2px_0_0_var(--color-dexglow)]' : null"
                >
                  <button type="button" :aria-pressed="selected === m.name" class="rounded text-left font-medium text-ink">
                    {{ m.label }}
                  </button>
                </td>
                <td class="pr-2 sm:pr-3"><TypeBadge :type="m.type" size="sm" /></td>
                <td class="pr-2 sm:pr-3">
                  <span class="text-[11px] font-semibold uppercase tracking-wider" :style="{ color: CLASS_STYLE[m.class].color }">
                    {{ t(CLASS_STYLE[m.class].key) }}
                  </span>
                </td>
                <td class="num pr-2 text-right text-muted sm:pr-3">{{ m.power ?? '—' }}</td>
                <td class="num pr-3 text-right text-muted max-md:hidden">{{ m.accuracy ?? '—' }}</td>
                <td class="num pr-3 text-right text-xs sm:pr-4" :class="m.tm ? 'text-lens' : 'text-dim'">{{ m.tm ?? '·' }}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>

      <!-- learners: the sticky side panel from 640px, a bottom sheet on a phone -->
      <Sheet
        :open="!!panel"
        :title="panel?.move.label ?? t('moves.selectTitle')"
        :close-label="t('common.close')"
        :content-key="selected"
        keep-when-cached
        class="animate-fadeup rounded-2xl border border-line bg-surface-1 p-4 sm:sticky sm:top-[4.5rem] sm:flex sm:max-h-[calc(100dvh-5.5rem)] sm:flex-col lg:p-5"
        style="animation-delay: 140ms"
        @close="onSheetClose"
      >
        <div v-if="!panel" class="grid min-h-48 place-items-center text-center">
          <div>
            <p class="font-display text-base uppercase tracking-[1px] text-muted">{{ t('moves.selectTitle') }}</p>
            <p class="mt-2 text-sm text-dim text-pretty">{{ t('moves.selectHint', { game: GAMES[version].label }) }}</p>
          </div>
        </div>
        <template v-else>
          <div class="shrink-0">
            <div class="flex flex-wrap items-center gap-2">
              <!-- on a phone the sheet's own header carries the name -->
              <h2 class="font-display text-2xl text-ink max-sm:hidden">{{ panel.move.label }}</h2>
              <TypeBadge :type="panel.move.type" size="sm" />
              <span v-if="panel.move.machines?.[vg]" class="num text-xs text-lens">{{ panel.move.machines[vg] }}</span>
            </div>
            <p class="mt-2 text-sm leading-relaxed text-muted text-pretty">{{ panel.move.effect }}</p>
            <dl class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <div class="flex gap-1.5"><dt class="text-dim">{{ t('moves.power') }}</dt><dd class="num text-ink">{{ panel.move.power ?? '—' }}</dd></div>
              <div class="flex gap-1.5"><dt class="text-dim">{{ t('moves.accuracy') }}</dt><dd class="num text-ink">{{ panel.move.accuracy ?? '—' }}</dd></div>
              <div class="flex gap-1.5"><dt class="text-dim">{{ t('moves.pp') }}</dt><dd class="num text-ink">{{ panel.move.pp }}</dd></div>
            </dl>
            <p class="mt-1 text-xs font-semibold text-muted tabular-nums">{{ t('moves.learners', panel.total) }}</p>
          </div>

          <div
            ref="listEl"
            class="scrollbar-thin mt-4 space-y-4 sm:-mr-2 sm:min-h-0 sm:flex-1 sm:overflow-y-auto sm:pr-2"
            @scroll.passive="onListScroll"
          >
            <section v-for="g in panel.groups" :key="g.id">
              <h3 class="eyebrow sticky top-0 z-10 bg-surface-1 py-1">
                {{ t(`methods.${g.id}`) }} <span class="num text-dim">· {{ g.mons.length }}</span>
              </h3>
              <div class="mt-1 grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-1.5">
                <RouterLink
                  v-for="p in g.mons" :key="p.id + '-' + g.id"
                  :to="`/pokemon/${p.id}`"
                  class="flex items-center gap-1 rounded-lg border border-line bg-bg/40 pr-2 transition-colors hover:border-line2 hover:bg-surface-2"
                >
                  <SpriteImg :src="spriteUrl(p.id, 'icons')" alt="" :w="68" :h="56" centred />
                  <span class="min-w-0 flex-1 leading-tight">
                    <span class="block truncate text-sm font-medium text-ink">{{ p.label }}</span>
                    <span v-if="g.id === 'level-up'" class="num block text-xs text-dim">{{ t('moves.lv', { n: p.level }) }}</span>
                  </span>
                </RouterLink>
              </div>
            </section>
            <p v-if="!panel.groups.length" class="rounded-lg border border-dashed border-line p-4 text-center text-sm text-dim">
              {{ t('moves.nobody', { game: GAMES[version].label }) }}
            </p>
          </div>
        </template>
      </Sheet>
    </div>
  </div>
</template>
