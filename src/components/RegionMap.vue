<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from './ui/Icon.vue'

const props = defineProps({
  map: { type: Object, required: true },
  /**
   * Highlighted places: { [slug]: { color: '#hex', lines } }. Each tooltip line is a string or
   * { icon, text } with an Icon name (see METHOD_ICON_NAMES), e.g. { icon: 'grass', text: 'Grass / Cave · Lv 2–5 · 45%' }.
   */
  highlights: { type: Object, default: () => ({}) },
  selected: { type: String, default: null },
  interactive: { type: Boolean, default: true },
  legend: { type: Boolean, default: true },
})
const emit = defineEmits(['select'])

const { t } = useI18n()

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

// pixel glyph in the middle of a place that has neither a city name nor a route number
const GLYPH = { cave: 'cave', forest: 'forest' }
const GLYPH_SIZE = 16

const vb = computed(() => `0 0 ${props.map.grid.w * CELL} ${props.map.grid.h * CELL}`)
const hasHighlights = computed(() => Object.keys(props.highlights).length > 0)

const routeNo = (label) => (label.match(/\d+/) || [null])[0]
const shortName = (label) => label.split(' ')[0]
const lineText = (line) => (typeof line === 'string' ? line : line.text)

const tooltip = ref(null) // { x, y, label, kind, lines, color }
const wrapEl = ref(null)

// hover or keyboard focus on a place
function showTip(e, place) {
  // the leaving page can still be in the DOM during the page transition, without its wrapper
  if (!wrapEl.value) return
  const wrap = wrapEl.value.getBoundingClientRect()
  const r = e.currentTarget.getBoundingClientRect()
  const hl = props.highlights[place.slug]
  // clamp inside the wrapper so edge markers can't widen the page on mobile
  const half = Math.min(120, wrap.width / 2)
  const x = Math.min(Math.max(r.left - wrap.left + r.width / 2, half), wrap.width - half)
  tooltip.value = {
    x,
    y: r.top - wrap.top,
    label: place.label,
    kind: place.kind,
    lines: hl?.lines ?? [],
    color: hl?.color ?? null,
  }
}

const LEGEND = ['city', 'route', 'water', 'cave', 'forest', 'event']

function rectAttrs(p) {
  return {
    x: p.x * CELL + PAD,
    y: p.y * CELL + PAD,
    width: (p.w ?? 1) * CELL - PAD * 2,
    height: (p.h ?? 1) * CELL - PAD * 2,
    rx: p.kind === 'city' ? 10 : 7,
  }
}

const center = (p) => ({ x: (p.x + (p.w ?? 1) / 2) * CELL, y: (p.y + (p.h ?? 1) / 2) * CELL })

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
    <svg
      :viewBox="vb"
      class="block w-full select-none"
      :role="interactive ? 'group' : null"
      :aria-label="interactive ? t('map.places') : null"
      @mouseleave="tooltip = null"
    >
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

      <!-- on an interactive map every place is a button: Tab reaches it, Enter or Space selects it -->
      <g
        v-for="p in map.places" :key="p.slug"
        :role="interactive ? 'button' : null"
        :tabindex="interactive ? 0 : null"
        :aria-label="interactive ? p.label : null"
        :aria-current="interactive && selected === p.slug ? 'true' : null"
        :class="[interactive || highlights[p.slug] ? 'cursor-pointer' : '', hasHighlights && !highlights[p.slug] ? 'opacity-40' : '']"
        class="place transition-opacity duration-300"
        @click="emit('select', p)"
        @keydown.enter.prevent="emit('select', p)"
        @keydown.space.prevent="emit('select', p)"
        @mouseenter="showTip($event, p)"
        @focus="showTip($event, p)"
        @blur="tooltip = null"
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
          :x="center(p).x" :y="center(p).y + 3"
          text-anchor="middle" fill="var(--color-ink)" opacity="0.92"
          style="font-family: var(--font-display); font-size: 9.5px; pointer-events: none"
        >{{ shortName(p.label) }}</text>
        <!-- route number -->
        <text
          v-else-if="p.kind === 'route' || p.kind === 'water'"
          :x="center(p).x" :y="center(p).y + 3.5"
          text-anchor="middle" :fill="p.kind === 'water' ? '#5d83c4' : 'var(--color-muted)'" opacity="0.85"
          style="font-family: var(--font-display); font-size: 10px; pointer-events: none"
        >{{ routeNo(p.label) ?? '·' }}</text>
        <!-- cave / forest / landmark glyph -->
        <Icon
          v-else
          :name="GLYPH[p.kind] ?? 'landmark'"
          :x="center(p).x - GLYPH_SIZE / 2"
          :y="center(p).y - GLYPH_SIZE / 2"
          class="pointer-events-none text-muted opacity-80"
        />
      </g>
    </svg>

    <!-- legend -->
    <ul v-if="legend" class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
      <li v-for="kind in LEGEND" :key="kind" class="flex items-center gap-1.5">
        <svg viewBox="0 0 14 14" class="size-3.5" aria-hidden="true">
          <rect
            x="1" y="1" width="12" height="12" :rx="kind === 'city' ? 4 : 3"
            :fill="KIND_STYLE[kind].fill" :stroke="KIND_STYLE[kind].stroke" stroke-width="1.5"
            :stroke-dasharray="kind === 'event' ? '2.5 2.5' : null"
          />
        </svg>
        <span class="text-[11px] font-semibold uppercase tracking-wider text-dim">{{ t(`map.legend.${kind}`) }}</span>
      </li>
    </ul>

    <!-- tooltip: visual only, a place's name is its accessible name -->
    <Transition name="tip">
      <div
        v-if="tooltip"
        aria-hidden="true"
        class="pointer-events-none absolute z-20 w-max max-w-[min(15rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-full rounded-lg border border-line2 bg-bg/95 px-3 py-2 shadow-xl shadow-black/50 backdrop-blur"
        :style="{ left: tooltip.x + 'px', top: tooltip.y - 6 + 'px' }"
      >
        <p class="font-display text-sm leading-tight" :style="{ color: tooltip.color ?? 'var(--color-ink)' }">
          {{ tooltip.label }}
        </p>
        <p v-for="(line, i) in tooltip.lines" :key="i" class="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
          <Icon v-if="line.icon" :name="line.icon" class="text-dim" />
          <span>{{ lineText(line) }}</span>
        </p>
        <p v-if="!tooltip.lines.length && interactive" class="mt-0.5 text-[11px] text-dim">{{ t('map.tipHint') }}</p>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.tip-enter-active, .tip-leave-active { transition: opacity 0.12s ease; }
.tip-enter-from, .tip-leave-to { opacity: 0; }

/* keyboard focus on a place: its outline turns lens blue instead of a browser box around the group */
.place:focus { outline: none; }
.place:focus-visible rect { stroke: var(--color-lens); stroke-width: 3; }
</style>
