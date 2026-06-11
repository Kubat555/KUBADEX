<script setup>
import { ref, computed, watch } from 'vue'
import { VERSION_GROUPS, VG_ORDER } from '../data/games'
import TypeBadge from './TypeBadge.vue'

const props = defineProps({
  moves: { type: Array, required: true }, // [{ name, learn: { vg: [[method, level]] } }]
  movedex: { type: Object, required: true },
  /** controlled mode: version group picked by the page — hides the internal tabs */
  versionGroup: { type: String, default: null },
})

const internalVg = ref('emerald')
const vg = computed(() => props.versionGroup ?? internalVg.value)
const method = ref('level-up')

watch(vg, () => {
  if (!availableMethods.value.some((m) => m.id === method.value))
    method.value = availableMethods.value[0]?.id ?? 'level-up'
})

const METHODS = [
  { id: 'level-up', label: 'Level Up' },
  { id: 'machine', label: 'TM / HM' },
  { id: 'tutor', label: 'Tutor' },
  { id: 'egg', label: 'Egg' },
]

const CLASS_STYLE = {
  physical: { label: 'PHYS', color: '#e8845a' },
  special: { label: 'SPEC', color: '#6d96d8' },
  status: { label: 'STAT', color: '#9aa3bd' },
}

const availableMethods = computed(() =>
  METHODS.filter((m) =>
    props.moves.some((mv) => mv.learn[vg.value]?.some(([method_]) => method_ === m.id)),
  ),
)

const rows = computed(() => {
  const out = []
  for (const mv of props.moves) {
    const entries = (mv.learn[vg.value] ?? []).filter(([m]) => m === method.value)
    if (!entries.length) continue
    const data = props.movedex[mv.name]
    if (!data) continue
    out.push({ name: mv.name, level: Math.min(...entries.map(([, l]) => l)), ...data })
  }
  if (method.value === 'level-up') out.sort((a, b) => a.level - b.level || a.label.localeCompare(b.label))
  else out.sort((a, b) => a.label.localeCompare(b.label))
  return out
})

const pickVg = (id) => (internalVg.value = id)
</script>

<template>
  <div>
    <!-- version group tabs (hidden when the page controls the version) -->
    <div v-if="!versionGroup" class="flex flex-wrap items-center gap-1.5">
      <button
        v-for="id in VG_ORDER" :key="id"
        class="rounded-lg border px-3 py-1.5 font-display text-xs tracking-wider transition-all"
        :class="vg === id ? 'text-bg' : 'border-line text-muted hover:border-line2 hover:text-ink'"
        :style="vg === id ? { background: VERSION_GROUPS[id].color, borderColor: VERSION_GROUPS[id].color } : null"
        @click="pickVg(id)"
      >{{ VERSION_GROUPS[id].label }}</button>
    </div>

    <!-- method tabs -->
    <div class="mt-3 flex flex-wrap gap-1">
      <button
        v-for="m in availableMethods" :key="m.id"
        class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
        :class="method === m.id ? 'bg-panel2 text-ink' : 'text-dim hover:text-muted'"
        @click="method = m.id"
      >{{ m.label }}</button>
    </div>

    <div v-if="!rows.length" class="mt-4 rounded-lg border border-dashed border-line p-6 text-center text-sm text-dim">
      No {{ METHODS.find((m) => m.id === method)?.label }} moves in {{ VERSION_GROUPS[vg].label }}.
    </div>

    <div v-else class="scrollbar-thin mt-3 overflow-x-auto">
      <table class="w-full min-w-130 text-sm">
        <thead>
          <tr class="border-b border-line text-left font-display text-[11px] tracking-wider text-dim">
            <th class="py-2 pr-2 font-normal">{{ method === 'level-up' ? 'LV' : '' }}</th>
            <th class="py-2 pr-3 font-normal">MOVE</th>
            <th class="py-2 pr-3 font-normal">TYPE</th>
            <th class="py-2 pr-3 font-normal">CLASS</th>
            <th class="py-2 pr-3 text-right font-normal">PWR</th>
            <th class="py-2 pr-3 text-right font-normal">ACC</th>
            <th class="py-2 text-right font-normal">PP</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="r in rows" :key="r.name"
            class="border-b border-line/50 transition-colors hover:bg-panel2/60"
            :title="r.effect"
          >
            <td class="py-2 pr-2 font-display text-xs text-muted">{{ method === 'level-up' ? (r.level || '—') : '' }}</td>
            <td class="py-2 pr-3 font-medium text-ink">{{ r.label }}</td>
            <td class="py-2 pr-3"><TypeBadge :type="r.type" size="sm" /></td>
            <td class="py-2 pr-3">
              <span
                class="rounded px-1.5 py-0.5 font-display text-[10px] tracking-wider"
                :style="{ color: CLASS_STYLE[r.class].color, background: `color-mix(in srgb, ${CLASS_STYLE[r.class].color} 14%, transparent)` }"
              >{{ CLASS_STYLE[r.class].label }}</span>
            </td>
            <td class="py-2 pr-3 text-right tabular-nums text-muted">{{ r.power ?? '—' }}</td>
            <td class="py-2 pr-3 text-right tabular-nums text-muted">{{ r.accuracy ?? '—' }}</td>
            <td class="py-2 text-right tabular-nums text-muted">{{ r.pp }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="mt-2 text-[11px] text-dim">
      Physical / Special is shown Gen 3-accurate: it depends on the move's <em>type</em>, not the move.
    </p>
  </div>
</template>
