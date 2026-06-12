<script setup>
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { usePrefsStore } from '../stores/prefs'
import { loadIndex, spriteUrl } from '../lib/api'
import { defenseProfile } from '../lib/typeChart'
import { GAMES } from '../data/games'
import bosses from '../data/bosses.json'
import TypeBadge from '../components/TypeBadge.vue'
import GameTabs from '../components/GameTabs.vue'

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

const list = computed(() => (bosses[vg.value] ?? []).map((b) => ({ ...b, bring: bringTypes(b.team) })))
const gyms = computed(() => list.value.filter((b) => b.title.startsWith('Gym')))
const league = computed(() => list.value.filter((b) => !b.title.startsWith('Gym')))
</script>

<template>
  <div>
    <section class="animate-fadeup mb-5 flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-line bg-panel/60 p-5">
      <div>
        <h1 class="font-display text-2xl text-ink">GYMS <span class="text-dexglow">&amp; LEAGUE</span></h1>
        <p class="mt-1 text-sm text-muted">Every boss battle of {{ GAMES[version].label }} in order — teams, levels and what to bring.</p>
      </div>
      <GameTabs v-model="version" />
    </section>

    <template v-for="(group, gi) in [gyms, league]" :key="gi">
      <h2 class="animate-fadeup mb-3 mt-6 font-display text-sm tracking-widest text-dexglow">
        {{ gi === 0 ? 'GYM LEADERS' : 'ELITE FOUR & CHAMPION' }}
      </h2>
      <div class="grid gap-4 md:grid-cols-2">
        <section
          v-for="(b, i) in group" :key="b.name"
          class="animate-fadeup relative overflow-hidden rounded-2xl border border-line bg-panel/70 p-4"
          :style="{ animationDelay: i * 50 + 'ms', '--t': `var(--color-type-${b.specialty})` }"
        >
          <div class="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full opacity-[0.12] blur-2xl" :style="{ background: 'var(--t)' }"></div>

          <div class="flex items-start gap-3">
            <img
              :src="spriteUrl(b.sprite, 'trainers')"
              :alt="b.name"
              class="pixelated size-16 shrink-0 rounded-xl border border-line bg-bg/40 object-contain p-1"
            />
            <div class="min-w-0 flex-1">
              <div class="flex items-baseline justify-between gap-2">
                <div class="flex items-baseline gap-2">
                  <span v-if="gi === 0" class="font-display text-lg text-dim">{{ String(i + 1).padStart(2, '0') }}</span>
                  <h3 class="truncate font-display text-xl text-ink">{{ b.name }}</h3>
                </div>
                <TypeBadge :type="b.specialty" size="sm" />
              </div>
              <p class="mt-0.5 text-xs text-muted">
                {{ b.title }} · {{ b.city }}<template v-if="b.badge"> · <span class="text-ink">{{ b.badge }}</span></template>
              </p>
            </div>
          </div>

          <div class="mt-3 flex flex-wrap gap-1.5">
            <RouterLink
              v-for="(m, mi) in b.team" :key="mi"
              :to="`/pokemon/${m.id}`"
              class="flex items-center gap-1.5 rounded-lg border border-line bg-bg/40 py-1 pl-1 pr-2 transition-colors hover:border-line2 hover:bg-panel2"
            >
              <img :src="spriteUrl(m.id, 'icons')" class="pixelated size-7" :alt="m.name" />
              <span class="text-xs font-medium text-ink">{{ m.name }}</span>
              <span class="font-display text-[10px] text-dim">{{ m.level }}</span>
            </RouterLink>
          </div>

          <div v-if="b.bring.length" class="mt-3 flex items-center gap-2">
            <span class="font-display text-[10px] tracking-widest text-dim">BRING</span>
            <TypeBadge v-for="t in b.bring" :key="t" :type="t" size="sm" />
          </div>
          <p v-if="b.note" class="mt-2 border-l-2 border-lens/50 pl-2 text-[11px] leading-relaxed text-muted">{{ b.note }}</p>
        </section>
      </div>
    </template>
  </div>
</template>
