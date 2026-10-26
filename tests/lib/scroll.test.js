import { it, expect, vi } from 'vitest'
import { scrollBehavior } from '../../src/router.js'
import { onPageAfterEnter } from '../../src/lib/pageTransition.js'

it('does not jump on query-only changes', async () =>
  expect(await scrollBehavior({ path: '/', name: 'pokedex' }, { path: '/', name: 'pokedex' }, null)).toBe(false))
it('waits for the page to enter before restoring', async () => {
  let done = false
  const p = scrollBehavior({ path: '/', name: 'pokedex' }, { path: '/pokemon/6', name: 'pokemon' }, { left: 0, top: 3000 }).then((v) => { done = true; return v })
  await Promise.resolve(); expect(done).toBe(false)
  onPageAfterEnter(); expect(await p).toEqual({ left: 0, top: 3000 })
})
it('gives up waiting after 400ms', async () => { vi.useFakeTimers()
  const p = scrollBehavior({ path: '/', name: 'pokedex' }, { path: '/map', name: 'map' }, { left: 0, top: 10 })
  vi.advanceTimersByTime(401); expect(await p).toEqual({ left: 0, top: 10 }); vi.useRealTimers() })
