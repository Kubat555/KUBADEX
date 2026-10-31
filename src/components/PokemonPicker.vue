<script setup>
// Pokémon picker (Compare, Team): an ARIA 1.2 combobox, the same pattern as the search palette.
// Focus stays in the field; ↑/↓ move the active option (aria-activedescendant), Enter picks it, Esc closes the list.
// An empty field lists the first entries of the dex; typed text is ranked by the shared search (names, numbers, typos).
import { ref, computed, watch, onMounted, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { loadIndex, spriteUrl } from '../lib/api'
import { searchPokemon } from '../lib/search'
import { dexNo } from '../lib/utils'
import SpriteImg from './ui/SpriteImg.vue'

const props = defineProps({
  exclude: { type: Array, default: () => [] },
  placeholder: { type: String, required: true },
  label: { type: String, required: true }, // accessible name of the field
})
const emit = defineEmits(['pick'])

const { t } = useI18n()
const listId = useId()
const optionId = (i) => `${listId}-${i}`

const LIMIT = 8
const index = ref([])
const query = ref('')
const open = ref(false)
const active = ref(0)
const wrapEl = ref(null)
const alignRight = ref(false)

onMounted(async () => (index.value = await loadIndex()))

const results = computed(() => {
  const allowed = (list) => list.filter((p) => !props.exclude.includes(p.id))
  if (!query.value.trim()) return allowed(index.value).slice(0, LIMIT)
  // enough matches that LIMIT are left once the excluded ones are dropped
  return allowed(searchPokemon(index.value, query.value, { limit: LIMIT + props.exclude.length })).slice(0, LIMIT)
})
const expanded = computed(() => open.value && results.value.length > 0)
watch(results, () => (active.value = 0))

const MENU_W = 288 // w-72 — wider than the input so names don't truncate
function onFocus() {
  const r = wrapEl.value?.getBoundingClientRect()
  alignRight.value = r ? r.left + MENU_W > window.innerWidth - 16 : false
  open.value = true
  active.value = 0
}

function pick(p) {
  if (!p) return
  emit('pick', p.id)
  query.value = ''
  open.value = false
}

function onKeydown(e) {
  if (e.isComposing) return
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault() // keep the caret in place
    const n = results.value.length
    if (!n) return
    if (!expanded.value) {
      open.value = true
      active.value = 0
    } else active.value = (active.value + (e.key === 'ArrowDown' ? 1 : -1) + n) % n
  } else if (e.key === 'Enter' && expanded.value) {
    e.preventDefault()
    pick(results.value[active.value])
  } else if (e.key === 'Escape' && open.value) {
    e.preventDefault()
    open.value = false
  }
}

// options keep the focus in the field (mousedown is prevented); the delay is a safety net for a blur before the click
const closeSoon = () => setTimeout(() => (open.value = false), 150)
</script>

<template>
  <div ref="wrapEl" class="relative">
    <input
      v-model="query"
      type="text"
      role="combobox"
      :aria-label="label"
      :aria-expanded="expanded"
      :aria-controls="listId"
      aria-autocomplete="list"
      :aria-activedescendant="expanded ? optionId(active) : undefined"
      :placeholder="placeholder"
      autocomplete="off"
      autocapitalize="off"
      autocorrect="off"
      spellcheck="false"
      class="h-10 w-full rounded-lg border border-line-strong bg-bg px-3 text-base text-ink transition-colors placeholder:text-dim sm:text-sm"
      @focus="onFocus"
      @input="open = true"
      @keydown="onKeydown"
      @blur="closeSoon"
    />
    <ul
      v-show="expanded"
      :id="listId"
      role="listbox"
      :aria-label="t('search.results')"
      class="absolute top-full z-50 mt-1.5 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-line-strong bg-surface-1 p-1 shadow-2xl shadow-black/60"
      :class="alignRight ? 'right-0' : 'left-0'"
    >
      <li
        v-for="(p, i) in results"
        :id="optionId(i)"
        :key="p.id"
        role="option"
        :aria-selected="i === active"
        class="flex cursor-pointer items-center gap-2 rounded-lg pr-3 text-sm transition-colors duration-(--dur-1)"
        :class="i === active ? 'bg-surface-2 text-ink' : 'text-muted'"
        @mousedown.prevent
        @mousemove="active = i"
        @click="pick(p)"
      >
        <SpriteImg :src="spriteUrl(p.id, 'icons')" alt="" :w="68" :h="56" centred class="-my-1" />
        <span class="num w-10 shrink-0 text-xs text-dim">{{ dexNo(p.id) }}</span>
        <span class="min-w-0 truncate font-medium">{{ p.label }}</span>
      </li>
    </ul>
  </div>
</template>
