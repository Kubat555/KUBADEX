import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { GAMES } from '../data/games'

const KEY = 'dex3-version'

export const usePrefsStore = defineStore('prefs', () => {
  const saved = localStorage.getItem(KEY)
  const version = ref(GAMES[saved] ? saved : 'emerald')
  watch(version, (v) => localStorage.setItem(KEY, v))
  return { version }
})
