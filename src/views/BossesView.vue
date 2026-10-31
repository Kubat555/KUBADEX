<script setup>
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { usePrefsStore } from '../stores/prefs'
import { loadIndex, spriteUrl } from '../lib/api'
import { defenseProfile } from '../lib/typeChart'
import { GAMES } from '../data/games'
import bosses from '../data/bosses.json'
import TypeBadge from '../components/TypeBadge.vue'
import GameTabs from '../components/GameTabs.vue'
import PageHeader from '../components/ui/PageHeader.vue'
import SpriteImg from '../components/ui/SpriteImg.vue'

const { t } = useI18n()
const { version } = storeToRefs(usePrefsStore())
const vg = computed(() => GAMES[version.value].vg)

const indexById = ref({})
onMounted(async () => {
  const idx = await loadIndex()
  indexById.value = Object.fromEntries(idx.map((p) => [p.id, p]))
})

/** types that hit the most of this boss's team super-effectively */
function bringTypes(team) {
  if (!Object.keys(indexById.value).length) return []
  const score = {}
  for (const member of team) {
    const types = indexById.value[member.id]?.types
    if (!types) continue
    const profile = defenseProfile(types)
    for (const [atk, mult] of Object.entries(profile))
      if (mult >= 2) score[atk] = (score[atk] ?? 0) + (mult === 4 ? 1.5 : 1)
  }
  return Object.entries(score)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .filter(([, s]) => s >= Math.min(2, team.length))
    .map(([t]) => t)
}

// the boss's role as written in bosses.json -> its label key; an unknown role is shown as written
const ROLE_KEYS = { 'Gym Leader': 'gymLeader', 'Gym Leaders': 'gymLeaders', 'Elite Four': 'eliteFour', Champion: 'champion' }
const roleLabel = (title) => (ROLE_KEYS[title] ? t(`bosses.role.${ROLE_KEYS[title]}`) : title)

const list = computed(() => (bosses[vg.value] ?? []).map((b) => ({ ...b, bring: bringTypes(b.team) })))
const gyms = computed(() => list.value.filter((b) => b.title.startsWith('Gym')))
const league = computed(() => list.value.filter((b) => !b.title.startsWith('Gym')))
</script>

<template>
  <div>
    <PageHeader :title="t('bosses.title')" :accent="t('bosses.accent')">
      {{ t('bosses.subtitle', { game: GAMES[version].label }) }}
      <template #actions><GameTabs v-model="version" /></template>
    </PageHeader>

    <template v-for="(group, gi) in [gyms, league]" :key="gi">
      <h2 class="eyebrow animate-fadeup mb-3" :class="gi === 0 ? 'mt-0' : 'mt-8'">
        {{ gi === 0 ? t('bosses.gyms') : t('bosses.league') }}
      </h2>
      <div class="grid gap-4 md:grid-cols-2">
        <section
          v-for="(b, i) in group" :key="b.name"
          class="animate-fadeup relative overflow-hidden rounded-2xl border border-line bg-surface-1 p-4 pt-5"
          :style="{ animationDelay: i * 50 + 'ms', '--t': `var(--color-type-${b.specialty})` }"
        >
          <!-- a stripe of the specialty type's colour (no blurred glow) -->
          <span aria-hidden="true" class="absolute inset-x-0 top-0 h-1 bg-(--t)" />

          <div class="flex items-start gap-3">
            <!-- the frame is outside the sprite: a border on the image itself would shrink it to a fractional size -->
            <div class="shrink-0 overflow-hidden rounded-xl border border-line bg-bg/40">
              <SpriteImg :src="spriteUrl(b.sprite, 'trainers')" alt="" :w="80" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-2">
                <div class="flex min-w-0 items-baseline gap-2">
                  <span v-if="gi === 0" class="num text-lg text-dim">{{ String(i + 1).padStart(2, '0') }}</span>
                  <h3 class="truncate font-display text-2xl text-ink">{{ b.name }}</h3>
                </div>
                <TypeBadge :type="b.specialty" size="sm" class="mt-1.5 shrink-0" />
              </div>
              <p class="mt-0.5 text-sm text-muted">
                {{ roleLabel(b.title) }} · {{ b.city }}<template v-if="b.badge"> · <span class="text-ink">{{ b.badge }}</span></template>
              </p>
            </div>
          </div>

          <div class="mt-3 flex flex-wrap gap-1.5">
            <RouterLink
              v-for="(m, mi) in b.team" :key="mi"
              :to="`/pokemon/${m.id}`"
              class="flex items-center gap-1 rounded-lg border border-line bg-bg/40 pr-2.5 transition-colors hover:border-line2 hover:bg-surface-2"
            >
              <SpriteImg :src="spriteUrl(m.id, 'gen3')" alt="" />
              <span class="flex flex-col leading-tight">
                <span class="text-sm font-medium text-ink">{{ m.name }}</span>
                <span class="num text-xs text-dim">{{ t('bosses.lv', { n: m.level }) }}</span>
              </span>
            </RouterLink>
          </div>

          <div v-if="b.bring.length" class="mt-3 flex flex-wrap items-center gap-2">
            <span class="eyebrow">{{ t('bosses.bring') }}</span>
            <TypeBadge v-for="ty in b.bring" :key="ty" :type="ty" size="sm" />
          </div>
          <p v-if="b.note" class="mt-2 border-l-2 border-lens/50 pl-2 text-xs leading-relaxed text-muted">{{ b.note }}</p>
        </section>
      </div>
    </template>
  </div>
</template>
