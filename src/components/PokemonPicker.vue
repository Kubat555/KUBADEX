<script setup>
import { ref, computed, onMounted } from 'vue'
import { loadIndex, spriteUrl } from '../lib/api'
import { dexNo } from '../lib/utils'

const props = defineProps({
  exclude: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Add a Pokémon…' },
})
const emit = defineEmits(['pick'])

const index = ref([])
const query = ref('')
const open = ref(false)
const hi = ref(0)
const wrapEl = ref(null)
const alignRight = ref(false)

onMounted(async () => (index.value = await loadIndex()))

const MENU_W = 288 // w-72 — wider than the input so names don't truncate
function onFocus() {
  const r = wrapEl.value?.getBoundingClientRect()
  alignRight.value = r ? r.left + MENU_W > window.innerWidth - 16 : false
  open.value = true
  hi.value = 0
}

const results = computed(() => {
  const q = query.value.trim().toLowerCase()
  const pool = index.value.filter((p) => !props.exclude.includes(p.id))
  if (!q) return pool.slice(0, 8)
  return pool.filter((p) => p.name.includes(q) || String(p.id) === q).slice(0, 8)
})

function pick(p) {
  if (!p) return
  emit('pick', p.id)
  query.value = ''
  open.value = false
}

function onKey(e) {
  if (e.key === 'ArrowDown') { e.preventDefault(); hi.value = Math.min(hi.value + 1, results.value.length - 1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); hi.value = Math.max(hi.value - 1, 0) }
  else if (e.key === 'Enter') pick(results.value[hi.value])
  else if (e.key === 'Escape') open.value = false
}

const closeSoon = () => setTimeout(() => (open.value = false), 150)
</script>

<template>
  <div ref="wrapEl" class="relative">
    <input
      v-model="query"
      type="search"
      :placeholder="placeholder"
      class="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-dim focus:border-dex"
      @focus="onFocus"
      @input="open = true; hi = 0"
      @keydown="onKey"
      @blur="closeSoon"
    />
    <ul
      v-if="open && results.length"
      class="absolute top-full z-50 mt-1.5 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-line bg-panel shadow-2xl shadow-black/60"
      :class="alignRight ? 'right-0' : 'left-0'"
    >
      <li v-for="(p, i) in results" :key="p.id">
        <button
          class="flex w-full items-center gap-3 px-3 py-1.5 text-left text-sm transition-colors"
          :class="i === hi ? 'bg-panel2 text-ink' : 'text-muted'"
          @mousedown.prevent="pick(p)"
          @mouseenter="hi = i"
        >
          <img :src="spriteUrl(p.id, 'icons')" class="pixelated size-8 object-contain" alt="" />
          <span class="font-display text-xs text-dim">{{ dexNo(p.id) }}</span>
          <span class="font-medium">{{ p.label }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>
