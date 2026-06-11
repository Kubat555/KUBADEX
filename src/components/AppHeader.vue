<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { loadIndex, spriteUrl } from '../lib/api'
import { dexNo } from '../lib/utils'

const router = useRouter()
const query = ref('')
const index = ref([])
const open = ref(false)
const hi = ref(0)
const inputEl = ref(null)

onMounted(async () => {
  index.value = await loadIndex()
  window.addEventListener('keydown', onGlobalKey)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onGlobalKey))

function onGlobalKey(e) {
  if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
    e.preventDefault()
    inputEl.value?.focus()
  }
}

const results = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  return index.value
    .filter((p) => p.name.includes(q) || String(p.id) === q || dexNo(p.id).includes(q))
    .slice(0, 8)
})

function go(p) {
  if (!p) return
  query.value = ''
  open.value = false
  router.push(`/pokemon/${p.id}`)
}

function onKey(e) {
  if (e.key === 'ArrowDown') { e.preventDefault(); hi.value = Math.min(hi.value + 1, results.value.length - 1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); hi.value = Math.max(hi.value - 1, 0) }
  else if (e.key === 'Enter') go(results.value[hi.value])
  else if (e.key === 'Escape') { open.value = false; e.target.blur() }
}

const closeSoon = () => setTimeout(() => (open.value = false), 150)

const links = [
  { to: '/', label: 'POKÉDEX' },
  { to: '/map', label: 'MAP' },
  { to: '/compare', label: 'COMPARE' },
  { to: '/team', label: 'TEAM' },
]
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
    <div class="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:gap-x-5">
      <!-- Pokéball logo + LEDs -->
      <RouterLink to="/" class="group flex shrink-0 items-center gap-2.5">
        <img
          src="/favicon.svg"
          alt=""
          class="size-9 drop-shadow-[0_0_10px_rgba(227,53,13,0.45)] transition-transform duration-300 group-hover:rotate-[20deg]"
        />
        <span class="flex flex-col leading-none">
          <span class="font-display text-xl tracking-wide text-ink group-hover:text-dexglow transition-colors">KUBADEX</span>
          <span class="hidden text-[10px] font-medium tracking-[0.18em] text-dim sm:block">HOENN · KANTO FIELD GUIDE</span>
        </span>
        <span class="ml-1 hidden gap-1 sm:flex">
          <span class="size-1.5 rounded-full bg-dex animate-blink"></span>
          <span class="size-1.5 rounded-full bg-type-electric"></span>
          <span class="size-1.5 rounded-full bg-type-grass"></span>
        </span>
      </RouterLink>

      <!-- nav: its own full-width row on mobile, inline on sm+ -->
      <nav class="order-3 -mb-1 flex w-full items-center justify-around border-t border-line/60 pt-1.5 sm:order-none sm:ml-auto sm:w-auto sm:justify-start sm:gap-1 sm:border-t-0 sm:pt-0">
        <RouterLink
          v-for="l in links" :key="l.to" :to="l.to"
          class="rounded-md px-2 py-1.5 font-display text-[13px] tracking-wider text-muted transition-colors hover:text-ink sm:px-3 sm:text-sm"
          exact-active-class="!text-dexglow"
        >{{ l.label }}</RouterLink>
      </nav>

      <!-- global search: shares the top row with the logo on mobile -->
      <div class="relative min-w-0 flex-1 sm:w-56 sm:flex-none">
        <input
          ref="inputEl"
          v-model="query"
          type="search"
          placeholder="Search…  /"
          class="w-full rounded-lg border border-line bg-panel px-3 py-1.5 text-sm text-ink outline-none transition-colors placeholder:text-dim focus:border-dex"
          @focus="open = true"
          @input="open = true; hi = 0"
          @keydown="onKey"
          @blur="closeSoon"
        />
        <ul
          v-if="open && results.length"
          class="absolute right-0 top-full z-50 mt-1.5 w-72 overflow-hidden rounded-xl border border-line bg-panel shadow-2xl shadow-black/60"
        >
          <li v-for="(p, i) in results" :key="p.id">
            <button
              class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors"
              :class="i === hi ? 'bg-panel2 text-ink' : 'text-muted'"
              @mousedown.prevent="go(p)"
              @mouseenter="hi = i"
            >
              <img :src="spriteUrl(p.id, 'icons')" class="pixelated size-8 object-contain" alt="" />
              <span class="font-display text-xs text-dim">{{ dexNo(p.id) }}</span>
              <span class="font-medium">{{ p.label }}</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  </header>
</template>
