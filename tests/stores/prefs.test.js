import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { usePrefsStore, detectLocale } from '../../src/stores/prefs.js'
import { readJSON, writeJSON } from '../../src/lib/storage.js'
import { breakLocalStorage, blockStorageAccess } from '../helpers/storage.js'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('lang')
  document.documentElement.removeAttribute('data-motion')
  setActivePinia(createPinia())
})
afterEach(() => vi.restoreAllMocks())

describe('detectLocale', () => {
  it.each([[['ru-RU'], 'ru'], [['ky-KG', 'en'], 'ru'], [['kk'], 'ru'], [['en-US'], 'en'], [['de'], 'en'], [[], 'en']])(
    'detectLocale(%j) = %s', (langs, expected) => expect(detectLocale(langs)).toBe(expected))

  it.each(['ru', 'be', 'kk', 'ky', 'uz', 'tg'])('treats the primary tag %s as ru', (tag) => {
    expect(detectLocale([tag])).toBe('ru')
    expect(detectLocale([`${tag}-XX`])).toBe('ru')
  })
})

describe('usePrefsStore', () => {
  it('defaults to Emerald, motion system and the browser language', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['ky-KG'])
    const p = usePrefsStore()
    expect(p.version).toBe('emerald')
    expect(p.motion).toBe('system')
    expect(p.locale).toBe('ru')
  })

  it('restores saved prefs', () => {
    writeJSON('prefs', { version: 'firered', locale: 'en', motion: 'full' })
    setActivePinia(createPinia())
    const p = usePrefsStore()
    expect([p.version, p.locale, p.motion]).toEqual(['firered', 'en', 'full'])
  })

  it('ignores an unknown saved game', () => {
    writeJSON('prefs', { version: 'zelda' }); setActivePinia(createPinia())
    expect(usePrefsStore().version).toBe('emerald')
  })

  it('does not treat Object.prototype keys as games', () => {
    writeJSON('prefs', { version: 'constructor' }); setActivePinia(createPinia())
    expect(usePrefsStore().version).toBe('emerald')
  })

  it('ignores an unknown saved locale or motion', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US'])
    writeJSON('prefs', { locale: 'fr', motion: 'turbo' }); setActivePinia(createPinia())
    const p = usePrefsStore()
    expect(p.locale).toBe('en')
    expect(p.motion).toBe('system')
  })

  it('falls back to defaults when the saved value is not an object', () => {
    writeJSON('prefs', 'garbage'); setActivePinia(createPinia())
    expect(usePrefsStore().version).toBe('emerald')
    writeJSON('prefs', null); setActivePinia(createPinia())
    expect(usePrefsStore().version).toBe('emerald')
  })

  it('persists every pref as one object under kubadex:v2:prefs', async () => {
    const p = usePrefsStore()
    p.version = 'ruby'; p.locale = 'ru'; p.motion = 'reduce'
    await nextTick()
    expect(readJSON('prefs', null)).toEqual({ version: 'ruby', locale: 'ru', motion: 'reduce' })
  })

  it('sets html lang and data-motion', async () => {
    const p = usePrefsStore(); p.locale = 'ru'; p.motion = 'reduce'; await nextTick()
    expect(document.documentElement.lang).toBe('ru')
    expect(document.documentElement.dataset.motion).toBe('reduce')
  })

  it('applies html lang and data-motion as soon as the store is created', () => {
    writeJSON('prefs', { locale: 'ru', motion: 'full' }); setActivePinia(createPinia())
    usePrefsStore()
    expect(document.documentElement.lang).toBe('ru')
    expect(document.documentElement.dataset.motion).toBe('full')
  })

  it('removes data-motion for the system setting', async () => {
    const p = usePrefsStore()
    p.motion = 'reduce'; await nextTick()
    expect(document.documentElement.hasAttribute('data-motion')).toBe(true)
    p.motion = 'system'; await nextTick()
    expect(document.documentElement.hasAttribute('data-motion')).toBe(false)
  })

  it('works with defaults and never throws when storage is blocked', async () => {
    breakLocalStorage('getItem', 'setItem', 'removeItem')
    expect(() => window.localStorage.getItem('x')).toThrow()
    const p = usePrefsStore()
    expect(p.version).toBe('emerald')
    expect(() => { p.version = 'ruby'; p.locale = 'ru'; p.motion = 'full' }).not.toThrow()
    await nextTick()
    expect(p.version).toBe('ruby')
  })

  it('works with defaults when window.localStorage itself throws', async () => {
    blockStorageAccess()
    expect(() => window.localStorage).toThrow()
    const p = usePrefsStore()
    expect(p.version).toBe('emerald')
    expect(() => { p.locale = 'ru' }).not.toThrow()
    await nextTick()
    expect(document.documentElement.lang).toBe('ru')
  })
})
