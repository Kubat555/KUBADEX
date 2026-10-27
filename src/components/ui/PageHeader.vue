<script setup>
// One page header for every screen: title (+ accent word in red), optional subtitle (default slot), actions on the right.
defineProps({
  title: { type: String, required: true },
  accent: { type: String, default: null },
})
</script>

<template>
  <header
    class="animate-fadeup mb-6 flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-line bg-surface-1 p-4 sm:p-5"
  >
    <div class="min-w-0">
      <h1 class="font-display text-2xl leading-tight text-balance text-ink">
        {{ title }}<template v-if="accent">{{ ' ' }}<span class="text-dexglow">{{ accent }}</span></template>
      </h1>
      <div v-if="$slots.default" class="mt-1 max-w-2xl text-sm text-muted">
        <slot />
      </div>
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>
