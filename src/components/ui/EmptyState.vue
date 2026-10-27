<script setup>
// "Nothing here" / "could not load": a phrase, an optional hint and actions (e.g. reset filters, retry).
// The three dim LEDs are the device's indicator row with nothing to show — decoration only.
defineProps({
  title: { type: String, required: true },
  hint: { type: String, default: null },
})
</script>

<template>
  <div class="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line2 px-6 py-14 text-center">
    <div class="flex gap-1.5" aria-hidden="true">
      <span class="size-1.5 bg-dex/60" />
      <span class="size-1.5 bg-warn/60" />
      <span class="size-1.5 bg-good/60" />
    </div>
    <p class="font-display text-base uppercase tracking-wider text-ink text-balance">{{ title }}</p>
    <p v-if="hint" class="max-w-md text-sm text-muted text-pretty">{{ hint }}</p>
    <div v-if="$slots.actions" class="mt-2 flex flex-wrap justify-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
