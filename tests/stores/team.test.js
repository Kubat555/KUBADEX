import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useTeamStore } from '../../src/stores/team.js'
import { readJSON, writeJSON } from '../../src/lib/storage.js'
import { breakLocalStorage, blockStorageAccess } from '../helpers/storage.js'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})
afterEach(() => vi.restoreAllMocks())

describe('useTeamStore', () => {
  it('starts with six empty slots', () => {
    expect(useTeamStore().slots).toEqual([null, null, null, null, null, null])
  })

  it('restores a saved team and pads it to six slots', () => {
    writeJSON('team', [25, null]); setActivePinia(createPinia())
    expect(useTeamStore().slots).toEqual([25, null, null, null, null, null])
  })

  it('ignores a saved value that is not an array', () => {
    writeJSON('team', { a: 1 }); setActivePinia(createPinia())
    expect(useTeamStore().slots).toEqual([null, null, null, null, null, null])
  })

  it('persists changes under kubadex:v2:team', async () => {
    const t = useTeamStore()
    t.add(25); t.add(6); await nextTick()
    expect(readJSON('team', null)).toEqual([25, 6, null, null, null, null])
  })

  it('works and never throws when storage is blocked', async () => {
    breakLocalStorage('getItem', 'setItem', 'removeItem')
    expect(() => window.localStorage.getItem('x')).toThrow()
    const t = useTeamStore()
    expect(() => t.add(25)).not.toThrow()
    await nextTick()
    expect(t.slots[0]).toBe(25)
  })

  it('works when window.localStorage itself throws', async () => {
    blockStorageAccess()
    expect(() => window.localStorage).toThrow()
    const t = useTeamStore()
    expect(t.slots).toEqual([null, null, null, null, null, null])
    expect(() => t.add(6)).not.toThrow()
    await nextTick()
    expect(t.slots[0]).toBe(6)
  })
})
