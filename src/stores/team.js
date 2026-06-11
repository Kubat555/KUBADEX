import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const KEY = 'dex3-team'

export const useTeamStore = defineStore('team', () => {
  const slots = ref([null, null, null, null, null, null])
  try {
    const saved = JSON.parse(localStorage.getItem(KEY))
    if (Array.isArray(saved)) slots.value = [...saved.slice(0, 6), null, null, null, null, null, null].slice(0, 6)
  } catch { /* fresh start */ }

  watch(slots, (v) => localStorage.setItem(KEY, JSON.stringify(v)), { deep: true })

  function add(id) {
    const i = slots.value.indexOf(null)
    if (i !== -1 && !slots.value.includes(id)) slots.value[i] = id
  }
  function setSlot(i, id) { slots.value[i] = id }
  function remove(i) { slots.value[i] = null }
  function clear() { slots.value = [null, null, null, null, null, null] }

  return { slots, add, setSlot, remove, clear }
})
