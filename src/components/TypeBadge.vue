<script setup>
import { useI18n } from 'vue-i18n'

// Text uses the `-ink` variant where the type has one (its fill is < 4.5:1 as text); tint and ring keep the fill colour.
// Onest caps, not Pixelify: the pixel font is never set under 14px. The tint is mixed into the page background,
// not into transparency, so the text keeps >= 4.5:1 on any surface (a selected or hovered surface-2 row included).
defineProps({
  type: { type: String, required: true },
  size: { type: String, default: 'md' }, // sm | md
})

const { t } = useI18n()
</script>

<template>
  <span
    class="inline-flex items-center rounded font-body font-semibold uppercase leading-none tracking-[0.08em]"
    :class="size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-xs'"
    :style="{
      color: `var(--color-type-${type}-ink, var(--color-type-${type}))`,
      background: `color-mix(in srgb, var(--color-type-${type}) 16%, var(--color-bg))`,
      boxShadow: `inset 0 0 0 1px color-mix(in srgb, var(--color-type-${type}) 45%, transparent)`,
    }"
  >{{ t('types.' + type) }}</span>
</template>
