<script setup>
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { usePrefsStore } from '../stores/prefs'
import { loadIndex, loadByLocation, spriteUrl } from '../lib/api'
import { GAMES, METHOD_ICON_NAMES } from '../data/games'
import { STAT_ORDER } from '../lib/utils'
import { rankHotspots } from '../lib/evHotspots'
import { useQueryState } from '../composables/useQueryState'
import GameTabs from '../components/GameTabs.vue'
import PageHeader from '../components/ui/PageHeader.vue'
import Segmented from '../components/ui/Segmented.vue'
import Skeleton from '../components/ui/Skeleton.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import SpriteImg from '../components/ui/SpriteImg.vue'
import Icon from '../components/ui/Icon.vue'

const { t, te } = useI18n()
const { version } = storeToRefs(usePrefsStore())

// the chosen stat lives in the URL query (shareable, restored by Back); Speed, the default, is left out of it
const EV_SCHEMA = { stat: { kind: 'enum', values: STAT_ORDER, default: 'spe' } }
const { state: filters, set } = useQueryState(EV_SCHEMA, { routeName: 'ev' })
const stat = computed(() => filters.value.stat)
const statOptions = computed(() => STAT_ORDER.map((s) => ({ value: s, label: t(`stats.${s}`) })))

const indexById = ref(null)
const byLoc = ref(null)
const loading = ref(false)
const failed = ref(false) // the data could not be loaded: an error screen with a retry, not an endless skeleton

// a retry keeps the error screen (its button busy) until the answer comes; api.js never caches a failed request
async function load() {
  loading.value = true
  try {
    const [idx, locs] = await Promise.all([loadIndex(), loadByLocation()])
    indexById.value = Object.fromEntries(idx.map((p) => [p.id, p]))
    byLoc.value = locs
    failed.value = false
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}
onMounted(load)

const region = computed(() => GAMES[version.value].region)

const hotspots = computed(() =>
  byLoc.value && indexById.value
    ? rankHotspots({ byLoc: byLoc.value, indexById: indexById.value, region: region.value, version: version.value, stat: stat.value })
    : [],
)

const maxEv = computed(() => hotspots.value[0]?.ev ?? 1)

// a method outside the label list shows its data slug
const methodLabel = (method) => (te(`methods.${method}`) ? t(`methods.${method}`) : method)
</script>

<template>
  <div>
    <PageHeader :title="t('ev.title')" :accent="t('ev.accent')">
      {{ t('ev.subtitle') }}
      <template #actions><GameTabs v-model="version" /></template>
    </PageHeader>

    <!-- phone: the six stats scroll sideways (the padding keeps the focus outline inside the scroll box) -->
    <div class="scrollbar-thin animate-fadeup mb-5 max-sm:-mx-4 max-sm:overflow-x-auto max-sm:px-4 max-sm:py-1" style="animation-delay: 60ms">
      <Segmented :model-value="stat" :options="statOptions" :label="t('ev.stat')" @update:model-value="set({ stat: $event })" />
    </div>

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

    <div v-else-if="!byLoc || !indexById" aria-busy="true" class="space-y-2.5">
      <p class="sr-only">{{ t('common.loading') }}</p>
      <Skeleton v-for="i in 4" :key="i" :h="128" :rounded="16" />
    </div>

    <EmptyState v-else-if="!hotspots.length" :title="t('ev.empty')" :hint="t('ev.emptyHint')" />

    <template v-else>
      <ol class="space-y-2.5">
        <li
          v-for="(h, i) in hotspots" :key="h.slug"
          class="animate-fadeup rounded-2xl border border-line bg-surface-1 p-4"
          :style="{ animationDelay: i * 35 + 'ms' }"
        >
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span class="num w-7 text-lg" :class="i === 0 ? 'text-dexglow' : 'text-dim'">{{ i + 1 }}</span>
            <h2 class="font-display text-base text-ink">{{ h.label }}</h2>
            <span class="flex items-center gap-1.5 text-sm text-muted">
              <Icon v-if="METHOD_ICON_NAMES[h.method]" :name="METHOD_ICON_NAMES[h.method]" class="text-dim" />
              {{ methodLabel(h.method) }}
            </span>
            <div class="ml-auto flex items-center gap-3">
              <div aria-hidden="true" class="hidden h-1.5 w-36 overflow-hidden rounded-full bg-surface-2 sm:block">
                <div class="h-full rounded-full bg-gradient-to-r from-dex to-dexglow" :style="{ width: (h.ev / maxEv) * 100 + '%' }"></div>
              </div>
              <p class="text-sm">
                <span class="num text-dexglow">{{ h.ev.toFixed(2) }}</span>
                <span class="ml-1 text-xs text-dim">{{ t('ev.perEncounter', { stat: t(`stats.${stat}`) }) }}</span>
              </p>
            </div>
          </div>
          <div class="mt-2.5 flex flex-wrap gap-1.5 sm:pl-11">
            <RouterLink
              v-for="m in h.mons" :key="m.id"
              :to="`/pokemon/${m.id}`"
              class="flex items-center gap-1 rounded-lg border border-line bg-bg/40 pr-2.5 transition-colors hover:border-line2 hover:bg-surface-2"
            >
              <SpriteImg :src="spriteUrl(m.id, 'gen3')" alt="" />
              <span class="flex flex-col leading-tight">
                <span class="text-sm font-medium text-ink">{{ m.name }}</span>
                <span class="num text-xs text-dim">{{ t('ev.yield', { ev: m.yield, chance: m.chance }) }}</span>
              </span>
            </RouterLink>
          </div>
        </li>
      </ol>

      <p class="mt-4 text-xs text-dim text-pretty">{{ t('ev.footnote') }}</p>
    </template>
  </div>
</template>
