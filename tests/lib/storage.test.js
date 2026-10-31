import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { KEY_PREFIX, readJSON, writeJSON, migrateLegacy } from '../../src/lib/storage.js'
import { breakLocalStorage, blockStorageAccess } from '../helpers/storage.js'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})
afterEach(() => vi.restoreAllMocks())

describe('readJSON / writeJSON', () => {
  it('round-trips a value under the kubadex:v2: prefix', () => {
    writeJSON('prefs', { a: 1 })
    expect(KEY_PREFIX).toBe('kubadex:v2:')
    expect(localStorage.getItem('kubadex:v2:prefs')).toBe('{"a":1}')
    expect(readJSON('prefs', null)).toEqual({ a: 1 })
  })

  it('returns the fallback for a missing key', () => {
    expect(readJSON('nope', 'fb')).toBe('fb')
  })

  it('returns the fallback for corrupted JSON', () => {
    localStorage.setItem('kubadex:v2:prefs', '{not json')
    expect(readJSON('prefs', { a: 1 })).toEqual({ a: 1 })
  })

  it('uses sessionStorage for the session area and keeps the areas separate', () => {
    writeJSON('last-query:pokedex', { q: 'pika' }, 'session')
    expect(sessionStorage.getItem('kubadex:v2:last-query:pokedex')).toBe('{"q":"pika"}')
    expect(readJSON('last-query:pokedex', {}, 'session')).toEqual({ q: 'pika' })
    expect(readJSON('last-query:pokedex', 'none')).toBe('none')
  })

  it('readJSON returns fallback when localStorage throws', () => {
    breakLocalStorage('getItem')
    expect(() => window.localStorage.getItem('x')).toThrow()
    expect(readJSON('prefs', { a: 1 })).toEqual({ a: 1 })
  })

  it('writeJSON swallows quota/security errors', () => {
    breakLocalStorage('setItem')
    expect(() => window.localStorage.setItem('x', '1')).toThrow()
    expect(() => writeJSON('prefs', { a: 1 })).not.toThrow()
  })

  it('survives the storage object itself being inaccessible', () => {
    blockStorageAccess()
    expect(() => window.localStorage).toThrow()
    expect(readJSON('prefs', { a: 1 })).toEqual({ a: 1 })
    expect(readJSON('prefs', 'fb', 'session')).toBe('fb')
    expect(() => writeJSON('prefs', { a: 1 })).not.toThrow()
    expect(() => writeJSON('prefs', { a: 1 }, 'session')).not.toThrow()
    expect(() => migrateLegacy()).not.toThrow()
  })

  it('writeJSON does not throw on a value JSON cannot encode', () => {
    const circular = {}
    circular.self = circular
    expect(() => writeJSON('prefs', circular)).not.toThrow()
  })
})

describe('migrateLegacy', () => {
  it('migrateLegacy moves dex3 keys once', () => {
    localStorage.setItem('dex3-version', 'firered'); localStorage.setItem('dex3-team', '[25,null]')
    localStorage.setItem('dex3-streak', '4')
    migrateLegacy(); migrateLegacy()
    expect(readJSON('prefs', {}).version).toBe('firered')
    expect(readJSON('team', null)).toEqual([25, null])
    expect(readJSON('wtp-streak', 0)).toBe(4)
    expect(localStorage.getItem('dex3-version')).toBeNull()
  })

  it('moves the daily WTP state and removes every legacy key', () => {
    const daily = { date: '2026-10-26', solved: true, gaveUp: false, misses: 2 }
    localStorage.setItem('dex3-version', 'leafgreen')
    localStorage.setItem('dex3-team', '[1,2,3,null,null,null]')
    localStorage.setItem('dex3-streak', '7')
    localStorage.setItem('dex3-wtp', JSON.stringify(daily))
    migrateLegacy()
    expect(readJSON('wtp-daily', null)).toEqual(daily)
    for (const k of ['dex3-version', 'dex3-team', 'dex3-streak', 'dex3-wtp']) expect(localStorage.getItem(k)).toBeNull()
  })

  it('keeps the other saved prefs when moving the version', () => {
    writeJSON('prefs', { locale: 'ru', motion: 'reduce', version: 'emerald' })
    localStorage.setItem('dex3-version', 'ruby')
    migrateLegacy()
    expect(readJSON('prefs', {})).toEqual({ locale: 'ru', motion: 'reduce', version: 'ruby' })
  })

  it('does nothing when there are no legacy keys', () => {
    writeJSON('team', [9])
    migrateLegacy()
    expect(readJSON('team', null)).toEqual([9])
    expect(readJSON('prefs', null)).toBeNull()
  })

  it('keeps the legacy keys when the new value cannot be written', () => {
    localStorage.setItem('dex3-team', '[25]')
    breakLocalStorage('setItem')
    expect(() => migrateLegacy()).not.toThrow()
    vi.restoreAllMocks()
    expect(localStorage.getItem('dex3-team')).toBe('[25]')
    migrateLegacy()
    expect(readJSON('team', null)).toEqual([25])
    expect(localStorage.getItem('dex3-team')).toBeNull()
  })

  it('drops an unparseable legacy value instead of carrying it over', () => {
    localStorage.setItem('dex3-team', '{broken')
    localStorage.setItem('dex3-streak', 'abc')
    migrateLegacy()
    expect(readJSON('team', null)).toBeNull()
    expect(readJSON('wtp-streak', null)).toBeNull()
    expect(localStorage.getItem('dex3-team')).toBeNull()
    expect(localStorage.getItem('dex3-streak')).toBeNull()
  })
})
