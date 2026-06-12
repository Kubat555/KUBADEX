import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, from, saved) {
    if (saved) return saved
    if (to.name === 'pokemon' && from.name === 'pokemon') return { top: 0, behavior: 'smooth' }
    return { top: 0 }
  },
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
