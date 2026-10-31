import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { readJSON, writeJSON } from '../lib/storage'

export const useTeamStore = defineStore('team', () => {
  const slots = ref([null, null, null, null, null, null])
  const saved = readJSON('team', null)
  if (Array.isArray(saved)) slots.value = [...saved.slice(0, 6), null, null, null, null, null, null].slice(0, 6)

  watch(slots, (v) => writeJSON('team', v), { deep: true })

  function add(id) {
    const i = slots.value.indexOf(null)
    if (i !== -1 && !slots.value.includes(id)) slots.value[i] = id
  }
  function setSlot(i, id) { slots.value[i] = id }
  function remove(i) { slots.value[i] = null }
  function clear() { slots.value = [null, null, null, null, null, null] }

  return { slots, add, setSlot, remove, clear }
})
