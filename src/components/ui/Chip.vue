<script setup>
// Filter toggle (multi-select). Selected: 24% tint of `color`, a border in it and a lit "LED" on the left.
// Unselected: neutral outline with the LED dimmed. The label stays `ink` in both states (no fading:
// ink keeps >= 4.5:1 on the dark background and on every 24% type tint), so the colour lives in the LED, border and fill.
defineProps({
  pressed: { type: Boolean, default: false },
  color: { type: String, default: 'var(--color-dexglow)' }, // any CSS colour, e.g. var(--color-type-fire)
})
</script>

<template>
  <button
    type="button"
    :aria-pressed="pressed"
    class="inline-flex h-8 shrink-0 items-center gap-2 rounded-lg border px-2.5 font-display text-base uppercase leading-none tracking-wide whitespace-nowrap text-ink transition-[background-color,border-color] duration-(--dur-2) ease-out active:translate-y-px"
    :class="pressed
      ? 'border-(--chip) bg-[color-mix(in_srgb,var(--chip)_24%,transparent)]'
      : 'border-line-strong hover:border-[color-mix(in_srgb,var(--chip)_60%,var(--color-line-strong))] hover:bg-[color-mix(in_srgb,var(--chip)_8%,transparent)]'"
    :style="{ '--chip': color }"
  >
    <span
      aria-hidden="true"
      class="size-1.5 shrink-0 transition-[background-color,box-shadow] duration-(--dur-2) ease-out"
      :class="pressed
        ? 'bg-(--chip) shadow-[0_0_6px_var(--chip)]'
        : 'bg-[color-mix(in_srgb,var(--chip)_40%,transparent)]'"
    />
    <slot />
  </button>
</template>
