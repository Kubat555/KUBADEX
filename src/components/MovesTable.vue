<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { VERSION_GROUPS } from '../data/games'
import { CLASS_STYLE } from '../lib/moveClass'
import TypeBadge from './TypeBadge.vue'
import Icon from './ui/Icon.vue'

const props = defineProps({
  moves: { type: Array, required: true }, // [{ name, learn: { vg: [[method, level]] } }]
  movedex: { type: Object, required: true },
  versionGroup: { type: String, required: true }, // picked by the page (its game switch)
})

const { t } = useI18n()

const METHODS = ['level-up', 'machine', 'tutor', 'egg']
const method = ref('level-up')

const availableMethods = computed(() =>
  METHODS.filter((m) => props.moves.some((mv) => mv.learn[props.versionGroup]?.some(([how]) => how === m))),
)

// another game or another entry may lack the open tab (e.g. no egg moves): fall back to the first one it has
watch(availableMethods, (list) => {
  if (!list.includes(method.value)) method.value = list[0] ?? 'level-up'
})

const byLevel = computed(() => method.value === 'level-up')

const rows = computed(() => {
  const out = []
  for (const mv of props.moves) {
    const entries = (mv.learn[props.versionGroup] ?? []).filter(([m]) => m === method.value)
    if (!entries.length) continue
    const data = props.movedex[mv.name]
    if (!data) continue
    out.push({ name: mv.name, level: Math.min(...entries.map(([, l]) => l)), ...data })
  }
  if (byLevel.value) out.sort((a, b) => a.level - b.level || a.label.localeCompare(b.label))
  else out.sort((a, b) => a.label.localeCompare(b.label))
  return out
})

// a move's effect opens in a row under it (a click or Enter, not a hover: phones have no hover)
const open = ref(new Set())
const toggle = (name) => (open.value.has(name) ? open.value.delete(name) : open.value.add(name))
watch([() => props.moves, () => props.versionGroup, method], () => open.value.clear())

const columns = computed(() => (byLevel.value ? 7 : 6))
</script>

<template>
  <div class="max-w-4xl">
    <!-- learn method tabs -->
    <div class="flex flex-wrap gap-1">
      <button
        v-for="m in availableMethods" :key="m"
        type="button"
        :aria-pressed="method === m"
        class="h-8 rounded-md px-3 text-sm font-medium transition-colors duration-(--dur-1)"
        :class="method === m ? 'bg-panel2 text-ink' : 'text-muted hover:text-ink'"
        @click="method = m"
      >{{ t(`methods.${m}`) }}</button>
    </div>

    <div v-if="!rows.length" class="mt-4 rounded-lg border border-dashed border-line p-6 text-center text-sm text-dim">
      {{ t('pokemon.moves.empty', { method: t(`methods.${method}`), game: VERSION_GROUPS[versionGroup].label }) }}
    </div>

    <div v-else class="scrollbar-thin mt-3 overflow-x-auto">
      <table class="w-full min-w-[36rem] table-fixed text-sm">
        <colgroup>
          <col v-if="byLevel" class="w-12" />
          <col />
          <col class="w-30" />
          <col class="w-20" />
          <col class="w-16" />
          <col class="w-16" />
          <col class="w-16" />
        </colgroup>
        <thead>
          <tr class="eyebrow border-b border-line text-left">
            <th v-if="byLevel" scope="col" class="py-2 pr-2 font-semibold">{{ t('pokemon.moves.level') }}</th>
            <th scope="col" class="py-2 pr-3 font-semibold">{{ t('pokemon.moves.move') }}</th>
            <th scope="col" class="py-2 pr-3 font-semibold">{{ t('pokemon.moves.type') }}</th>
            <th scope="col" class="py-2 pr-3 font-semibold">{{ t('pokemon.moves.class') }}</th>
            <th scope="col" class="py-2 pr-3 text-right font-semibold">{{ t('pokemon.moves.power') }}</th>
            <th scope="col" class="py-2 pr-3 text-right font-semibold">{{ t('pokemon.moves.accuracy') }}</th>
            <th scope="col" class="py-2 text-right font-semibold">{{ t('pokemon.moves.pp') }}</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="r in rows" :key="r.name">
            <tr
              class="cursor-pointer border-b border-line/50 transition-colors duration-(--dur-1) hover:bg-panel2/60"
              :class="open.has(r.name) ? 'bg-panel2/40' : ''"
              @click="toggle(r.name)"
            >
              <td v-if="byLevel" class="num py-2 pr-2 text-muted">{{ r.level }}</td>
              <td class="py-2 pr-3">
                <!-- the click lands on the row; the button gives the row a keyboard stop and announces open/closed -->
                <button type="button" :aria-expanded="open.has(r.name)" class="flex w-full items-center gap-1.5 text-left font-medium text-ink">
                  <span class="min-w-0 break-words">{{ r.label }}</span>
                  <Icon
                    name="chevron-down"
                    class="text-dim transition-transform duration-(--dur-2)"
                    :class="open.has(r.name) ? 'rotate-180' : ''"
                  />
                </button>
              </td>
              <td class="py-2 pr-3"><TypeBadge :type="r.type" size="sm" /></td>
              <td class="py-2 pr-3">
                <span
                  class="rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider"
                  :style="{ color: CLASS_STYLE[r.class].color, background: `color-mix(in srgb, ${CLASS_STYLE[r.class].color} 14%, transparent)` }"
                >{{ t(CLASS_STYLE[r.class].key) }}</span>
              </td>
              <td class="num py-2 pr-3 text-right text-muted">{{ r.power ?? '—' }}</td>
              <td class="num py-2 pr-3 text-right text-muted">{{ r.accuracy ?? '—' }}</td>
              <td class="num py-2 text-right text-muted">{{ r.pp }}</td>
            </tr>
            <tr v-if="open.has(r.name)" class="border-b border-line/50 bg-panel2/40">
              <!-- lined up under the move name -->
              <td :colspan="columns" class="pt-1 pr-3 pb-3 text-sm text-muted text-pretty" :class="byLevel ? 'pl-12' : ''">{{ r.effect }}</td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
    <p class="mt-2 text-[11px] text-dim">{{ t('pokemon.moves.classNote') }}</p>
  </div>
</template>
