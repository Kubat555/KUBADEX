import { it, expect, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useQueryState } from '../../src/composables/useQueryState.js'
import { readJSON } from '../../src/lib/storage.js'

const SCHEMA = {
  q: { kind: 'text', max: 40 },
  type: { kind: 'list', values: ['fire', 'water', 'flying'], max: 2, default: [] },
  sort: { kind: 'enum', values: ['id', 'name'], default: 'id' },
}

// The list component is mounted directly (not inside RouterView), so it stays alive while other routes are active,
// the way KeepAlive keeps a cached page alive.
async function setup(path = '/', opts = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'list', component: { render: () => null } },
      { path: '/other', name: 'other', component: { render: () => null } },
    ],
  })
  router.push(path)
  await router.isReady()
  let api
  const List = defineComponent({
    setup() {
      api = useQueryState(SCHEMA, { routeName: 'list', sessionKey: 'last-query:test', ...opts })
      return () => h('div')
    },
  })
  mount(List, { global: { plugins: [router] } })
  return { router, api }
}

beforeEach(() => sessionStorage.clear())

it('keeps the last of several changes made in one tick', async () => {
  const { router, api } = await setup('/?sort=name&q=x')
  api.reset(); api.set({ type: ['fire'] })
  await flushPromises()
  expect(router.currentRoute.value.query).toEqual({ type: 'fire' })
  expect(api.state.value).toEqual({ q: '', type: ['fire'], sort: 'id' })
})

it('follows the URL only while its own route is active', async () => {
  const { router, api } = await setup('/?type=water')
  expect(api.state.value.type).toEqual(['water'])
  await router.push('/other?type=fire&sort=name')
  expect(api.state.value).toEqual({ q: '', type: ['water'], sort: 'id' })
  await router.push('/?sort=name')
  expect(api.state.value).toEqual({ q: '', type: [], sort: 'name' })
})

it('shows text at once but writes it to the URL after the debounce', async () => {
  const { router, api } = await setup('/', { textDebounceMs: 20 })
  api.set({ q: 'char' })
  await flushPromises()
  expect(api.state.value.q).toBe('char')
  expect(router.currentRoute.value.query).toEqual({})
  await new Promise((r) => setTimeout(r, 30))
  await flushPromises()
  expect(router.currentRoute.value.query).toEqual({ q: 'char' })
})

it('a non-text change writes pending text along with it', async () => {
  const { router, api } = await setup('/', { textDebounceMs: 20 })
  api.set({ q: 'char' }); api.set({ sort: 'name' })
  await flushPromises()
  expect(router.currentRoute.value.query).toEqual({ q: 'char', sort: 'name' })
})

it('remembers the last query in sessionStorage', async () => {
  const { api } = await setup('/')
  api.set({ type: ['fire', 'flying'] })
  await flushPromises()
  expect(readJSON('last-query:test', null, 'session')).toEqual({ type: 'fire,flying' })
})
