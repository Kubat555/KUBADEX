<script setup>
// Global search (Ctrl/⌘+K, "/", the search buttons): a modal <dialog> with an ARIA 1.2 combobox.
// Focus stays in the field; ↑/↓ move the active option (aria-activedescendant), Enter opens it, Esc closes.
// Phone: full screen. Wider: a panel near the top; a click outside it closes. The parent owns `open`.
import { computed, nextTick, ref, useId, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { loadIndex, spriteUrl } from '../lib/api'
import { searchPokemon } from '../lib/search'
import { dexNo } from '../lib/utils'
import Icon from './ui/Icon.vue'
import SpriteImg from './ui/SpriteImg.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
})
const emit = defineEmits(['close'])

const { t } = useI18n()
const router = useRouter()
const listId = useId()
const optionId = (i) => `${listId}-${i}`

const dialog = ref(null)
const input = ref(null)
const query = ref('')
const active = ref(0)
const index = ref(null) // the pokemon index, loaded on the first open
const failed = ref(false)
let returnFocus = null

const results = computed(() => (index.value ? searchPokemon(index.value, query.value) : []))
const expanded = computed(() => results.value.length > 0)
watch(results, () => (active.value = 0))

// the line under the field when there is no list: a hint, loading, nothing found or a load error
const message = computed(() => {
  if (failed.value) return t('search.failed')
  if (!query.value.trim()) return t('search.hint')
  if (!index.value) return t('common.loading')
  return t('search.empty', { q: query.value.trim() })
})
// announced by screen readers as the list changes
const status = computed(() => (expanded.value ? t('search.count', results.value.length) : query.value.trim() ? message.value : ''))

async function loadOnce() {
  if (index.value) return
  failed.value = false
  try {
    index.value = await loadIndex()
  } catch {
    failed.value = true // the next open tries again
  }
}

watch(() => props.open, async (open) => {
  if (!open) {
    if (dialog.value?.open) dialog.value.close() // focus is returned in onClosed
    return
  }
  query.value = ''
  returnFocus = document.activeElement
  if (!dialog.value.open) dialog.value.showModal()
  await nextTick()
  input.value?.focus()
  loadOnce()
})

// fires for our own close() and when the browser closes the dialog by itself (e.g. a repeated Esc).
// Focus goes back to the opener only if nothing has it: the event can come late, after a navigation
// has already moved the focus to the new page.
function onClosed() {
  const focused = document.activeElement
  const lost = !focused || focused === document.body || dialog.value?.contains(focused)
  if (lost && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true })
  returnFocus = null
  if (props.open) emit('close')
}

// a click on the dimmed area around the panel closes; one that only ends there (text selection dragged
// out of the field) does not
let downOnBackdrop = false
function onBackdropDown(e) {
  downOnBackdrop = e.target === e.currentTarget
}
function onBackdropClick(e) {
  if (downOnBackdrop && e.target === e.currentTarget) emit('close')
  downOnBackdrop = false
}

// leaving the page another way (Back, a link) closes the palette too
watch(() => router.currentRoute.value.fullPath, () => props.open && emit('close'))

function go(p) {
  if (!p) return
  router.push(`/pokemon/${p.id}`)
  emit('close')
}

async function move(step) {
  const n = results.value.length
  if (!n) return
  active.value = (active.value + step + n) % n
  await nextTick()
  document.getElementById(optionId(active.value))?.scrollIntoView({ block: 'nearest' })
}

function onKeydown(e) {
  if (e.isComposing) return
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault() // keep the caret in place
    move(e.key === 'ArrowDown' ? 1 : -1)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    go(results.value[active.value])
  } else if (e.key === 'Escape') {
    e.preventDefault() // handled here, so the dialog does not also get `cancel`
    emit('close')
  }
}

const typeNames = (p) => p.types.map((type) => t(`types.${type}`)).join(' · ')
</script>

<template>
  <dialog
    ref="dialog"
    :aria-label="t('search.label')"
    class="search-palette fixed inset-0 m-0 size-full max-h-none max-w-none bg-transparent p-0 text-ink backdrop:bg-bg/80 sm:px-4 sm:pt-[12vh]"
    @cancel.prevent="emit('close')"
    @close="onClosed"
    @mousedown="onBackdropDown"
    @click="onBackdropClick"
  >
    <div
      class="flex h-full flex-col overflow-hidden bg-surface-1 sm:mx-auto sm:h-auto sm:max-h-[min(36rem,80vh)] sm:max-w-xl sm:rounded-2xl sm:border sm:border-line-strong sm:shadow-[0_24px_60px_rgb(0_0_0/0.55)]"
    >
      <div class="flex shrink-0 items-center gap-3 border-b-2 border-line pr-1.5 pl-4 transition-colors duration-(--dur-1) focus-within:border-lens">
        <Icon name="search" class="text-muted" />
        <input
          ref="input"
          v-model="query"
          type="text"
          role="combobox"
          :aria-label="t('search.label')"
          :aria-expanded="expanded"
          :aria-controls="listId"
          aria-autocomplete="list"
          :aria-activedescendant="expanded ? optionId(active) : undefined"
          :placeholder="t('search.placeholder')"
          autocomplete="off"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          enterkeyhint="go"
          class="search-palette__input h-14 min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-dim"
          @keydown="onKeydown"
        />
        <button
          type="button"
          :aria-label="t('common.close')"
          class="grid size-11 shrink-0 place-items-center rounded-lg text-muted transition-colors duration-(--dur-1) hover:text-ink active:translate-y-px"
          @click="emit('close')"
        >
          <Icon name="close" />
        </button>
      </div>

      <ul
        v-show="expanded"
        :id="listId"
        role="listbox"
        :aria-label="t('search.results')"
        class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2"
      >
        <li
          v-for="(p, i) in results"
          :id="optionId(i)"
          :key="p.id"
          role="option"
          :aria-selected="i === active"
          class="flex cursor-pointer items-center gap-3 rounded-lg pr-3 transition-colors duration-(--dur-1)"
          :class="i === active ? 'bg-surface-2' : null"
          @mousedown.prevent
          @mousemove="active = i"
          @click="go(p)"
        >
          <SpriteImg :src="spriteUrl(p.id, 'icons')" alt="" :w="68" :h="56" centred class="-my-1" />
          <span class="num w-11 shrink-0 text-sm text-dim">{{ dexNo(p.id) }}</span>
          <span class="min-w-0 flex-1">
            <span class="block truncate font-display text-base text-ink">{{ p.label }}</span>
            <span class="block truncate text-xs text-muted">{{ typeNames(p) }}</span>
          </span>
          <Icon v-if="i === active" name="arrow-right" class="text-dexglow" />
        </li>
      </ul>

      <p v-if="!expanded" class="px-4 py-6 text-sm text-muted text-pretty">{{ message }}</p>
      <p class="sr-only" aria-live="polite">{{ status }}</p>
    </div>
  </dialog>
</template>

<style>
/* the page behind the open palette does not scroll */
:root:has(.search-palette[open]) { overflow: hidden; }
/* the field shows focus by the lens-coloured line under it (focus-within), not by the global outline */
.search-palette__input:focus-visible { outline: none; }
</style>
