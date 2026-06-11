<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  map: { type: Object, required: true },
  /** { [slug]: { color: '#hex', lines: ['🌿 Grass · Lv 2–5 · 45%'] } } — highlighted places */
  highlights: { type: Object, default: () => ({}) },
  selected: { type: String, default: null },
  interactive: { type: Boolean, default: true },
})
const emit = defineEmits(['select'])

const CELL = 46
const PAD = 3

const KIND_STYLE = {
  city: { fill: '#34415f', stroke: '#54689f' },
  route: { fill: '#252e4d', stroke: '#39466f' },
  water: { fill: '#1b2c52', stroke: '#2e4f88' },
  cave: { fill: '#2b2740', stroke: '#4c4170' },
  forest: { fill: '#1e3a2e', stroke: '#31624b' },
  landmark: { fill: '#23354a', stroke: '#3d5e80' },
  event: { fill: 'transparent', stroke: '#3d8ea8' },
}

const vb = computed(() => `0 0 ${props.map.grid.w * CELL} ${props.map.grid.h * CELL}`)
const hasHighlights = computed(() => Object.keys(props.highlights).length > 0)

const routeNo = (label) => (label.match(/\d+/) || [null])[0]
const shortName = (label) => label.split(' ')[0]

const tooltip = ref(null) // { x, y, label, kind, lines, color }
const wrapEl = ref(null)

function showTip(e, place) {
  const wrap = wrapEl.value.getBoundingClientRect()
  const r = e.currentTarget.getBoundingClientRect()
  const hl = props.highlights[place.slug]
  tooltip.value = {
    x: r.left - wrap.left + r.width / 2,
    y: r.top - wrap.top,
    label: place.label,
    kind: place.kind,
    lines: hl?.lines ?? [],
    color: hl?.color ?? null,
  }
}

function rectAttrs(p) {
  return {
    x: p.x * CELL + PAD,
    y: p.y * CELL + PAD,
    width: (p.w ?? 1) * CELL - PAD * 2,
    height: (p.h ?? 1) * CELL - PAD * 2,
    rx: p.kind === 'city' ? 10 : 7,
  }
}

function fillFor(p) {
  const hl = props.highlights[p.slug]
  if (hl) return `color-mix(in srgb, ${hl.color} 38%, ${KIND_STYLE[p.kind].fill})`
  return KIND_STYLE[p.kind].fill
}
function strokeFor(p) {
  const hl = props.highlights[p.slug]
  if (hl) return hl.color
  if (props.selected === p.slug) return 'var(--color-dexglow)'
  return KIND_STYLE[p.kind].stroke
}
</script>

<template>
  <div ref="wrapEl" class="relative">
    <svg :viewBox="vb" class="block w-full select-none" @mouseleave="tooltip = null">
      <!-- band separators (e.g. Sevii Islands) -->
      <g v-for="b in map.bands || []" :key="b.label">
        <line
          :x1="CELL * 0.2" :x2="map.grid.w * CELL - CELL * 0.2"
          :y1="b.y * CELL" :y2="b.y * CELL"
          stroke="var(--color-line)" stroke-dasharray="3 6" stroke-width="1.5"
        />
        <text
          :x="map.grid.w * CELL / 2" :y="b.y * CELL - 7"
          text-anchor="middle" fill="var(--color-dim)"
          style="font-family: var(--font-display); font-size: 13px; letter-spacing: 0.25em"
        >{{ b.label }}</text>
      </g>

      <g
        v-for="p in map.places" :key="p.slug"
        :class="[interactive || highlights[p.slug] ? 'cursor-pointer' : '', hasHighlights && !highlights[p.slug] ? 'opacity-40' : '']"
        class="transition-opacity duration-300"
        @click="emit('select', p)"
        @mouseenter="showTip($event, p)"
      >
        <rect
          v-bind="rectAttrs(p)"
          :fill="fillFor(p)"
          :stroke="strokeFor(p)"
          :stroke-width="highlights[p.slug] || selected === p.slug ? 2.5 : 1.4"
          :stroke-dasharray="p.kind === 'event' && !highlights[p.slug] ? '4 4' : null"
          :class="highlights[p.slug] ? 'animate-marker' : ''"
          :style="highlights[p.slug] ? { filter: `drop-shadow(0 0 7px ${highlights[p.slug].color})` } : null"
        />
        <!-- city name -->
        <text
          v-if="p.kind === 'city'"
          :x="(p.x + (p.w ?? 1) / 2) * CELL" :y="(p.y + (p.h ?? 1) / 2) * CELL + 3"
          text-anchor="middle" fill="var(--color-ink)" opacity="0.92"
          style="font-family: var(--font-display); font-size: 9.5px; pointer-events: none"
        >{{ shortName(p.label) }}</text>
        <!-- route number -->
        <text
          v-else-if="p.kind === 'route' || p.kind === 'water'"
          :x="(p.x + (p.w ?? 1) / 2) * CELL" :y="(p.y + (p.h ?? 1) / 2) * CELL + 3.5"
          text-anchor="middle" :fill="p.kind === 'water' ? '#5d83c4' : 'var(--color-muted)'" opacity="0.85"
          style="font-family: var(--font-display); font-size: 10px; pointer-events: none"
        >{{ routeNo(p.label) ?? '·' }}</text>
        <!-- cave / forest / landmark glyph -->
        <text
          v-else
          :x="(p.x + (p.w ?? 1) / 2) * CELL" :y="(p.y + (p.h ?? 1) / 2) * CELL + 4"
          text-anchor="middle" fill="var(--color-muted)" opacity="0.8"
          style="font-size: 10px; pointer-events: none"
        >{{ p.kind === 'cave' ? '▲' : p.kind === 'forest' ? '❋' : '◆' }}</text>
      </g>
    </svg>

    <!-- tooltip -->
    <Transition name="tip">
      <div
        v-if="tooltip"
        class="pointer-events-none absolute z-20 w-max max-w-60 -translate-x-1/2 -translate-y-full rounded-lg border border-line2 bg-bg/95 px-3 py-2 shadow-xl shadow-black/50 backdrop-blur"
        :style="{ left: tooltip.x + 'px', top: tooltip.y - 6 + 'px' }"
      >
        <p class="font-display text-sm leading-tight" :style="{ color: tooltip.color ?? 'var(--color-ink)' }">
          {{ tooltip.label }}
        </p>
        <p v-for="(line, i) in tooltip.lines" :key="i" class="mt-0.5 text-xs text-muted">{{ line }}</p>
        <p v-if="!tooltip.lines.length && interactive" class="mt-0.5 text-[11px] text-dim">Click for encounters</p>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.tip-enter-active, .tip-leave-active { transition: opacity 0.12s ease; }
.tip-enter-from, .tip-leave-to { opacity: 0; }
</style>
