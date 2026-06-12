<script setup>
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { usePrefsStore } from '../stores/prefs'
import { loadMoves, loadLearners, loadIndex, spriteUrl } from '../lib/api'
import { TYPES } from '../lib/typeChart'
import { GAMES } from '../data/games'
import { dexNo } from '../lib/utils'
import TypeBadge from '../components/TypeBadge.vue'
import GameTabs from '../components/GameTabs.vue'

const { version } = storeToRefs(usePrefsStore())
const vg = computed(() => GAMES[version.value].vg)

const movedex = ref(null)
const learners = ref(null)
const indexById = ref({})
onMounted(async () => {
  const [m, l, idx] = await Promise.all([loadMoves(), loadLearners(), loadIndex()])
  movedex.value = m
  learners.value = l
  indexById.value = Object.fromEntries(idx.map((p) => [p.id, p]))
})

const query = ref('')
const typeFilter = ref(null)
const classFilter = ref(null)
const tmOnly = ref(false)
const selected = ref(null) // move name

const CLASS_STYLE = {
  physical: { label: 'PHYS', color: '#e8845a' },
  special: { label: 'SPEC', color: '#6d96d8' },
  status: { label: 'STAT', color: '#9aa3bd' },
}

const rows = computed(() => {
  if (!movedex.value) return []
  const q = query.value.trim().toLowerCase()
  return Object.entries(movedex.value)
    .map(([name, m]) => ({ name, ...m, tm: m.machines?.[vg.value] }))
    .filter((m) =>
      (!q || m.name.includes(q) || m.label.toLowerCase().includes(q)) &&
      (!typeFilter.value || m.type === typeFilter.value) &&
      (!classFilter.value || m.class === classFilter.value) &&
      (!tmOnly.value || m.tm),
    )
    .sort((a, b) => (tmOnly.value ? (a.tm > b.tm ? 1 : -1) : a.label.localeCompare(b.label)))
})

const METHOD_ORDER = [
  ['level-up', 'Level Up'],
  ['machine', 'TM / HM'],
  ['tutor', 'Move Tutor'],
  ['egg', 'Egg Move'],
]

const panel = computed(() => {
  if (!selected.value || !learners.value) return null
  const move = movedex.value[selected.value]
  const entries = learners.value[selected.value]?.[vg.value] ?? []
  const groups = METHOD_ORDER.map(([id, label]) => ({
    id,
    label,
    mons: entries
      .filter(([, method]) => method === id)
      .map(([pid, , level]) => ({ ...indexById.value[pid], level }))
      .filter((p) => p.id)
      .sort((a, b) => (id === 'level-up' ? a.level - b.level || a.id - b.id : a.id - b.id)),
  })).filter((g) => g.mons.length)
  return { name: selected.value, move, groups, total: entries.length }
})
</script>

<template>
  <div>
    <section class="animate-fadeup mb-5 flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-line bg-panel/60 p-5">
      <div>
        <h1 class="font-display text-2xl text-ink">MOVE<span class="text-dexglow">DEX</span></h1>
        <p class="mt-1 text-sm text-muted">All {{ movedex ? Object.keys(movedex).length : '…' }} Gen 3 moves — pick one to see every Pokémon that learns it.</p>
      </div>
      <GameTabs v-model="version" />
    </section>

    <section class="animate-fadeup mb-5 space-y-3 rounded-2xl border border-line bg-panel/60 p-4" style="animation-delay: 60ms">
      <div class="flex flex-wrap items-center gap-2.5">
        <input
          v-model="query"
          type="search"
          placeholder="Move name…"
          class="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink outline-none placeholder:text-dim focus:border-dex sm:w-52"
        />
        <div class="flex gap-1">
          <button
            v-for="(c, id) in CLASS_STYLE" :key="id"
            class="rounded-md border px-2 py-1.5 font-display text-[10px] tracking-wider transition-colors"
            :class="classFilter === id ? 'border-line2 bg-panel2' : 'border-line text-dim hover:text-muted'"
            :style="classFilter === id ? { color: c.color } : null"
            @click="classFilter = classFilter === id ? null : id"
          >{{ c.label }}</button>
        </div>
        <button
          class="rounded-md border px-2 py-1.5 font-display text-[10px] tracking-wider transition-colors"
          :class="tmOnly ? 'border-dex bg-dex/10 text-dexglow' : 'border-line text-dim hover:text-muted'"
          @click="tmOnly = !tmOnly"
        >TM / HM ONLY</button>
        <span class="ml-auto font-display text-xs text-dim">{{ rows.length }} MOVES</span>
      </div>
      <div class="flex flex-wrap gap-1">
        <button
          v-for="t in TYPES" :key="t"
          class="rounded px-2 py-1 font-display text-[11px] uppercase tracking-wider transition-all"
          :style="{
            color: `var(--color-type-${t})`,
            background: typeFilter === t ? `color-mix(in srgb, var(--color-type-${t}) 28%, transparent)` : 'transparent',
            boxShadow: typeFilter === t
              ? `inset 0 0 0 1.5px var(--color-type-${t})`
              : `inset 0 0 0 1px color-mix(in srgb, var(--color-type-${t}) 28%, transparent)`,
            opacity: typeFilter && typeFilter !== t ? 0.5 : 1,
          }"
          @click="typeFilter = typeFilter === t ? null : t"
        >{{ t }}</button>
      </div>
    </section>

    <div class="grid items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
      <!-- table -->
      <section class="animate-fadeup min-w-0 overflow-hidden rounded-2xl border border-line bg-panel/60" style="animation-delay: 100ms">
        <div class="scrollbar-thin max-h-[70vh] overflow-y-auto">
          <table class="w-full text-sm">
            <thead class="sticky top-0 bg-panel">
              <tr class="border-b border-line text-left font-display text-[11px] tracking-wider text-dim">
                <th class="py-2.5 pl-4 pr-3 font-normal">MOVE</th>
                <th class="py-2.5 pr-3 font-normal">TYPE</th>
                <th class="py-2.5 pr-3 font-normal">CLASS</th>
                <th class="py-2.5 pr-3 text-right font-normal">PWR</th>
                <th class="py-2.5 pr-3 text-right font-normal">ACC</th>
                <th class="py-2.5 pr-4 text-right font-normal">TM</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="m in rows" :key="m.name"
                class="cursor-pointer border-b border-line/40 transition-colors"
                :class="selected === m.name ? 'bg-panel2' : 'hover:bg-panel2/50'"
                @click="selected = selected === m.name ? null : m.name"
              >
                <td class="py-2 pl-4 pr-3 font-medium text-ink">{{ m.label }}</td>
                <td class="py-2 pr-3"><TypeBadge :type="m.type" size="sm" /></td>
                <td class="py-2 pr-3">
                  <span class="font-display text-[10px] tracking-wider" :style="{ color: CLASS_STYLE[m.class].color }">{{ CLASS_STYLE[m.class].label }}</span>
                </td>
                <td class="py-2 pr-3 text-right tabular-nums text-muted">{{ m.power ?? '—' }}</td>
                <td class="py-2 pr-3 text-right tabular-nums text-muted">{{ m.accuracy ?? '—' }}</td>
                <td class="py-2 pr-4 text-right font-display text-xs" :class="m.tm ? 'text-lens' : 'text-dim'">{{ m.tm ?? '·' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- learners panel -->
      <section class="animate-fadeup rounded-2xl border border-line bg-panel/60 p-5 lg:sticky lg:top-20" style="animation-delay: 140ms">
        <div v-if="!panel" class="grid min-h-48 place-items-center text-center">
          <div>
            <p class="font-display text-sm tracking-widest text-dim">SELECT A MOVE</p>
            <p class="mt-2 text-xs text-dim">to see who learns it in {{ GAMES[version].label }}</p>
          </div>
        </div>
        <template v-else>
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="font-display text-xl text-ink">{{ panel.move.label }}</h2>
            <TypeBadge :type="panel.move.type" size="sm" />
            <span v-if="panel.move.machines?.[vg]" class="font-display text-xs text-lens">{{ panel.move.machines[vg] }}</span>
          </div>
          <p class="mt-1.5 text-xs leading-relaxed text-muted">{{ panel.move.effect }}</p>
          <p class="mt-1 font-display text-[10px] tracking-wider text-dim">
            PWR {{ panel.move.power ?? '—' }} · ACC {{ panel.move.accuracy ?? '—' }} · PP {{ panel.move.pp }} · {{ panel.total }} LEARNERS
          </p>

          <div class="scrollbar-thin mt-3 max-h-[52vh] space-y-4 overflow-y-auto pr-1">
            <div v-for="g in panel.groups" :key="g.id">
              <p class="sticky top-0 bg-panel py-1 font-display text-[10px] tracking-widest text-dexglow">{{ g.label.toUpperCase() }} · {{ g.mons.length }}</p>
              <div class="mt-1 grid grid-cols-2 gap-1">
                <RouterLink
                  v-for="p in g.mons" :key="p.id + '-' + g.id"
                  :to="`/pokemon/${p.id}`"
                  class="flex items-center gap-1.5 rounded-md border border-line bg-bg/40 px-1.5 py-1 transition-colors hover:border-line2 hover:bg-panel2"
                >
                  <img :src="spriteUrl(p.id, 'icons')" class="pixelated size-6 shrink-0" alt="" />
                  <span class="truncate text-xs text-ink">{{ p.label }}</span>
                  <span v-if="g.id === 'level-up'" class="ml-auto shrink-0 font-display text-[9px] text-dim">{{ p.level }}</span>
                </RouterLink>
              </div>
            </div>
            <p v-if="!panel.groups.length" class="rounded-lg border border-dashed border-line p-4 text-center text-xs text-dim">
              Nobody learns it in {{ GAMES[version].label }}.
            </p>
          </div>
        </template>
      </section>
    </div>
  </div>
</template>
