import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { readJSON } from '../lib/storage'

// The last query of a page in this tab, kept in sessionStorage by that page (only an object can be a query).
function lastQuery(key) {
  const saved = readJSON(key, {}, 'session')
  return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {}
}

/**
 * Menu targets and the current menu section, shared by the header (>= 640px) and the bottom bar (< 640px).
 * `to[name]` is the link of a menu entry (`name` = route name, label `nav.<name>`); `section` is the entry
 * the current page belongs to (a pokemon entry belongs to the Pokédex).
 */
export function useNavLinks() {
  const route = useRoute()

  // Pokédex (menu and logo) and Compare return to the last view of this tab. Storage is not reactive,
  // so the stored queries are read again after every navigation (a filter change is a navigation too).
  // On the page itself its URL is that view: the page may store it only after this watcher has run
  // (Back to an older query, a first visit that mounts the page after the transition).
  const pokedexTo = ref('/')
  const compareTo = ref('/compare')
  watch(() => route.fullPath, () => {
    pokedexTo.value = { path: '/', query: route.name === 'pokedex' ? route.query : lastQuery('last-query:pokedex') }
    compareTo.value = { path: '/compare', query: route.name === 'compare' ? route.query : lastQuery('last-query:compare') }
  }, { immediate: true })

  const to = computed(() => ({
    pokedex: pokedexTo.value,
    map: '/map',
    moves: '/moves',
    bosses: '/bosses',
    ev: '/ev-training',
    compare: compareTo.value,
    team: '/team',
    settings: '/settings',
  }))

  const section = computed(() => (route.name === 'pokemon' ? 'pokedex' : route.name))

  return { to, section }
}
