<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { START_LOCATION, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AppHeader from './components/AppHeader.vue'
import BottomNav from './components/BottomNav.vue'
import SearchPalette from './components/SearchPalette.vue'
import { onPageAfterEnter } from './lib/pageTransition'

// heavy lists stay alive for an instant Back; their state itself lives in the URL
const CACHED_PAGES = ['PokedexView', 'MovedexView', 'MapExplorerView']

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const mainEl = ref(null)
const paletteOpen = ref(false)

// Pages with `meta.titleKey` get "<title> — KUBADEX"; a page without it (the pokemon entry) sets its own title.
// Set as soon as the navigation is confirmed, not after the transition: a tab opened in the background runs
// no transition until it is shown, and its title is exactly what the user sees of it meanwhile.
function applyTitle(to) {
  const key = to.meta.titleKey
  if (key) document.title = `${t(key)} — KUBADEX`
}
watch(locale, () => applyTitle(route))

// After a navigation the new page takes the focus, so keyboard and screen reader users start at its content.
// Not on the first page: there focus stays at the top of the document and the first Tab reaches the skip link.
let moveFocus = false
const removeAfterEach = router.afterEach((to, from, failure) => {
  if (failure) return
  applyTitle(to)
  if (from !== START_LOCATION) moveFocus = true
})
onBeforeUnmount(removeAfterEach)

function onAfterEnter() {
  onPageAfterEnter()
  if (moveFocus) mainEl.value?.focus({ preventScroll: true })
}

function skipToContent() {
  mainEl.value?.focus({ preventScroll: true })
}

// Ctrl/⌘+K toggles the search palette from anywhere; "/" opens it unless the user is typing.
// `code` keeps ⌘K working on non-Latin layouts (Russian: the K key types "л").
function isTyping(el) {
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}
function onGlobalKeydown(e) {
  if (e.defaultPrevented || e.isComposing) return
  const key = String(e.key ?? '') // autofill fires keydown without a key
  const cmdK = (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && (e.code === 'KeyK' || key.toLowerCase() === 'k')
  const slash = key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(document.activeElement)
  if (!cmdK && !slash) return
  e.preventDefault()
  paletteOpen.value = cmdK ? !paletteOpen.value : true
}
onMounted(() => window.addEventListener('keydown', onGlobalKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onGlobalKeydown))
</script>

<template>
  <a
    href="#main"
    class="skip-link rounded-lg border border-line-strong bg-surface-2 px-4 py-2.5 font-display text-sm uppercase tracking-wide text-ink shadow-[0_8px_24px_rgb(0_0_0/0.5)]"
    @click.prevent="skipToContent"
  >{{ t('nav.skip') }}</a>

  <div class="flex min-h-screen flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:pb-0">
    <AppHeader @search="paletteOpen = true" />
    <main id="main" ref="mainEl" tabindex="-1" class="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in" @after-enter="onAfterEnter">
          <KeepAlive :include="CACHED_PAGES" :max="3">
            <component :is="Component" />
          </KeepAlive>
        </Transition>
      </RouterView>
    </main>
    <footer class="border-t border-line px-4 py-5 text-center text-xs text-dim">
      <i18n-t keypath="footer.text" tag="p" scope="global" class="mx-auto max-w-3xl text-pretty">
        <template #source>
          <a href="https://pokeapi.co" target="_blank" rel="noopener" class="text-muted underline decoration-line2 hover:text-ink">PokéAPI</a>
        </template>
      </i18n-t>
    </footer>
  </div>

  <BottomNav @search="paletteOpen = true" />
  <SearchPalette :open="paletteOpen" @close="paletteOpen = false" />
</template>

<style>
.page-enter-active, .page-leave-active { transition: opacity 0.12s ease, transform 0.12s ease; }
.page-enter-from { opacity: 0; transform: translateY(6px); }
.page-leave-to { opacity: 0; }

/* first Tab stop of every page: out of view until it has focus */
.skip-link { position: fixed; top: 0.5rem; left: 1rem; z-index: 50; transform: translateY(-200%); }
.skip-link:focus { transform: none; }

/* <main> takes focus only programmatically (after a navigation, skip link); a frame around the whole page is noise */
#main:focus { outline: none; }

/* keyboard focus never lands under the fixed bottom bar (phone) or the sticky header (wider) */
html { scroll-padding-bottom: calc(3.5rem + env(safe-area-inset-bottom)); }
@media (width >= 640px) {
  html { scroll-padding-top: 4.5rem; scroll-padding-bottom: 0; }
}
</style>
