import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { GAMES } from '../data/games'
import { readJSON, writeJSON } from '../lib/storage'

const LOCALES = ['ru', 'en']
const MOTIONS = ['system', 'reduce', 'full']
// Primary language tags whose speakers get the Russian UI by default.
const RU_PRIMARY_TAGS = new Set(['ru', 'be', 'kk', 'ky', 'uz', 'tg'])

// The browser's first-choice language decides: `navigator.languages[0]`'s primary tag in the list above -> 'ru', else 'en'.
export function detectLocale(languages) {
  const primary = String(languages[0] ?? '').toLowerCase().split('-')[0]
  return RU_PRIMARY_TAGS.has(primary) ? 'ru' : 'en'
}

function browserLanguages() {
  try {
    return navigator.languages?.length ? navigator.languages : [navigator.language]
  } catch {
    return []
  }
}

export const usePrefsStore = defineStore('prefs', () => {
  const saved = readJSON('prefs', {})
  const s = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {}

  const version = ref(Object.hasOwn(GAMES, s.version) ? s.version : 'emerald')
  const locale = ref(LOCALES.includes(s.locale) ? s.locale : detectLocale(browserLanguages()))
  const motion = ref(MOTIONS.includes(s.motion) ? s.motion : 'system')

  watch([version, locale, motion], () => {
    writeJSON('prefs', { version: version.value, locale: locale.value, motion: motion.value })
  })

  // <html lang> and <html data-motion>; the attribute is absent for 'system' so only the OS setting applies.
  watch([locale, motion], () => {
    const root = document.documentElement
    root.lang = locale.value
    if (motion.value === 'system') root.removeAttribute('data-motion')
    else root.dataset.motion = motion.value
  }, { immediate: true })

  return { version, locale, motion }
})
