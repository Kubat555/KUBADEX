<script setup>
import { GAMES, GAME_ORDER } from '../data/games'

defineProps({
  modelValue: String,
  versions: { type: Array, default: () => GAME_ORDER },
  /** versions that have data — the others get a dashed outline but stay readable and clickable */
  active: { type: Array, default: null },
})
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="flex flex-wrap gap-1.5">
    <button
      v-for="v in versions" :key="v"
      type="button"
      :aria-pressed="modelValue === v"
      class="h-8 rounded-lg border px-3 font-display text-sm leading-none tracking-wider transition-colors duration-(--dur-1) active:translate-y-px"
      :class="modelValue === v
        ? 'text-bg'
        : active && !active.includes(v)
          ? 'border-dashed border-line text-dim hover:border-line-strong hover:text-ink'
          : 'border-line-strong text-muted hover:text-ink'"
      :style="modelValue === v ? { background: GAMES[v].color, borderColor: GAMES[v].color } : null"
      @click="emit('update:modelValue', v)"
    >{{ GAMES[v].label }}</button>
  </div>
</template>
