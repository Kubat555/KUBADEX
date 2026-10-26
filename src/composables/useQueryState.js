import { shallowRef, watch, onScopeDispose } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { parseQuery, serializeQuery } from '../lib/queryState'
import { writeJSON } from '../lib/storage'

const sameQuery = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// Filter state of a list screen, kept in its URL query (see lib/queryState.js for the schema).
// - `state` is the single source the screen renders from; it changes at once, the URL follows via router.replace
//   (filter clicks must not pile up history entries). Text-only changes reach the URL after `textDebounceMs`.
// - `set` merges into the local state, not into route.query, so several calls in one tick all survive.
// - Back/forward and pasted links flow URL -> state, but only while `routeName` is the current route: under KeepAlive
//   a cached screen keeps its watchers while another page is shown, and must not react to that page's query.
// - The last query is kept in sessionStorage under `sessionKey`, for menu links back to the last view.
export function useQueryState(schema, { routeName, textDebounceMs = 200, sessionKey } = {}) {
  const route = useRoute()
  const router = useRouter()
  const state = shallowRef(parseQuery(route.query, schema))
  let timer = null

  const remember = (query) => sessionKey && writeJSON(sessionKey, query, 'session')

  function cancelPendingWrite() {
    clearTimeout(timer)
    timer = null
  }

  function writeUrl() {
    cancelPendingWrite()
    const query = serializeQuery(state.value, schema)
    remember(query)
    // a debounced write can land after the user has left: never put this screen's query on another page's URL
    if (route.name === routeName) router.replace({ query })
  }

  function set(patch) {
    // the round trip through the schema keeps the state exactly what the URL would give back
    state.value = parseQuery(serializeQuery({ ...state.value, ...patch }, schema), schema)
    const textOnly = Object.keys(patch).every((key) => schema[key]?.kind === 'text')
    if (textOnly && textDebounceMs > 0) {
      cancelPendingWrite()
      timer = setTimeout(writeUrl, textDebounceMs)
    } else writeUrl()
  }

  function reset() {
    state.value = parseQuery({}, schema)
    writeUrl()
  }

  if (route.name === routeName) remember(serializeQuery(state.value, schema))

  watch(() => route.query, (query) => {
    if (route.name !== routeName) return
    cancelPendingWrite()
    const next = parseQuery(query, schema)
    const nextQuery = serializeQuery(next, schema)
    remember(nextQuery)
    if (!sameQuery(nextQuery, serializeQuery(state.value, schema))) state.value = next
  })

  onScopeDispose(cancelPendingWrite)

  return { state, set, reset }
}
