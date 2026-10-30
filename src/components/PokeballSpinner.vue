<script setup>
import { useI18n } from 'vue-i18n'

// `label` is shown under the ball; without one it says the localized "Loading…".
defineProps({ label: { type: String, default: null } })

const { t } = useI18n()
</script>

<template>
  <div role="status" class="flex flex-col items-center gap-3 py-20">
    <svg aria-hidden="true" viewBox="0 0 32 32" class="size-10 animate-spin" style="animation-duration: 0.9s">
      <circle cx="16" cy="16" r="14" class="fill-dex" />
      <path d="M2 16a14 14 0 0 0 28 0Z" class="fill-ink" />
      <rect x="2" y="14.5" width="28" height="3" class="fill-bg" />
      <circle cx="16" cy="16" r="5" class="fill-bg" />
      <circle cx="16" cy="16" r="3" class="fill-ink" />
    </svg>
    <p class="font-display text-base uppercase tracking-[2px] text-dim">{{ label ?? t('common.loading') }}</p>
  </div>
</template>
