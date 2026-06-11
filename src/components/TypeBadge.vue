<script setup>
defineProps({
  type: { type: String, required: true },
  size: { type: String, default: 'md' }, // sm | md
})
</script>

<template>
  <span
    class="inline-flex items-center rounded font-display uppercase leading-none tracking-wider"
    :class="size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'"
    :style="{
      color: `var(--color-type-${type})`,
      background: `color-mix(in srgb, var(--color-type-${type}) 16%, transparent)`,
      boxShadow: `inset 0 0 0 1px color-mix(in srgb, var(--color-type-${type}) 45%, transparent)`,
    }"
  >{{ type }}</span>
</template>
