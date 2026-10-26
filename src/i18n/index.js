import { createI18n } from 'vue-i18n'
import { usePrefsStore } from '../stores/prefs'
import en from './locales/en.json'
import ru from './locales/ru.json'

// Russian plural rule for vue-i18n (it ships none): 1, 21, 31… -> "one"; 2–4, 22–24… -> "few"; 0, 5–20, 25–30… -> "many".
// Message variants are `zero | one | few | many` when there are four, `one | few | many` when there are three.
// The index is clamped so a shorter message (e.g. `one | other`) never points past its last variant.
export function ruPlural(choice, choicesLength) {
  const n = Math.abs(choice)
  const hasZero = choicesLength === 4
  if (hasZero && n === 0) return 0
  const mod10 = n % 10
  const mod100 = n % 100
  let form = 2
  if (mod10 === 1 && mod100 !== 11) form = 0
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) form = 1
  return Math.min(form + (hasZero ? 1 : 0), choicesLength - 1)
}

// The initial locale comes from the prefs store (saved or detected language), but the store needs the active Pinia,
// which does not exist yet when this module is evaluated: main.js aligns it with `setLocale(prefs.locale)` before mounting.
export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  pluralRules: { ru: ruPlural },
  messages: { en, ru },
})

// The one way to change the UI language: updates the live messages, and prefs (which persists it and sets <html lang>).
export function setLocale(l) {
  i18n.global.locale.value = l
  usePrefsStore().locale = l
}
