import { createRouter, createWebHistory } from 'vue-router'
import { pageEntered } from './lib/pageTransition'

// Longest wait for the page transition before a saved scroll position is applied anyway.
const PAGE_ENTER_TIMEOUT_MS = 400

// The "Motion: less" setting (<html data-motion="reduce">), or the OS preference unless the setting says "full".
function reducedMotion() {
  const setting = document.documentElement.dataset.motion
  if (setting) return setting === 'reduce'
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

function afterPageEnter() {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, PAGE_ENTER_TIMEOUT_MS)
    pageEntered().then(() => {
      clearTimeout(timer)
      resolve()
    })
  })
}

export function scrollBehavior(to, from, saved) {
  // only the query changed (filters, ?game=): stay where the user is
  if (to.path === from.path) return false
  if (saved) {
    // the same page component is reused without a transition, so there is nothing to wait for
    if (to.name === from.name) return saved
    // Back to another page: the out-in transition is still showing the old page; restore once the new one is in
    return afterPageEnter().then(() => saved)
  }
  if (to.name === 'pokemon' && from.name === 'pokemon' && !reducedMotion()) return { top: 0, behavior: 'smooth' }
  return { top: 0 }
}

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior,
  routes: [
    { path: '/', name: 'pokedex', component: () => import('./views/PokedexView.vue') },
    { path: '/pokemon/:id(\\d+)', name: 'pokemon', component: () => import('./views/PokemonView.vue') },
    { path: '/map', name: 'map', component: () => import('./views/MapExplorerView.vue') },
    { path: '/moves', name: 'moves', component: () => import('./views/MovedexView.vue') },
    { path: '/bosses', name: 'bosses', component: () => import('./views/BossesView.vue') },
    { path: '/ev-training', name: 'ev', component: () => import('./views/EvHotspotsView.vue') },
    { path: '/compare', name: 'compare', component: () => import('./views/CompareView.vue') },
    { path: '/team', name: 'team', component: () => import('./views/TeamView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router
