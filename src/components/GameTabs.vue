<script setup>
import { GAMES, GAME_ORDER } from '../data/games'

const props = defineProps({
  modelValue: String,
  versions: { type: Array, default: () => GAME_ORDER },
  /** versions that have data — others render dimmed but stay clickable */
  active: { type: Array, default: null },
})
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="flex flex-wrap gap-1.5">
    <button
      v-for="v in versions" :key="v"
      class="rounded-lg border px-3 py-1.5 font-display text-xs tracking-wider transition-all"
      :class="[
        modelValue === v ? 'text-bg' : 'border-line text-muted hover:border-line2 hover:text-ink',
        active && !active.includes(v) && modelValue !== v ? 'opacity-45' : '',
      ]"
      :style="modelValue === v ? { background: GAMES[v].color, borderColor: GAMES[v].color } : null"
      @click="emit('update:modelValue', v)"
    >{{ GAMES[v].label }}</button>
  </div>
</template>
