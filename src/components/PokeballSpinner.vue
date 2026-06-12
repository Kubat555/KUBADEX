<script setup>
defineProps({ label: { type: String, default: 'LOADING…' } })
</script>

<template>
  <div class="flex flex-col items-center gap-3 py-20">
    <svg viewBox="0 0 32 32" class="size-10 animate-spin" style="animation-duration: 0.9s">
      <circle cx="16" cy="16" r="14" fill="#e3350d" />
      <path d="M2 16a14 14 0 0 0 28 0Z" fill="#f4f6fb" />
      <rect x="2" y="14.5" width="28" height="3" fill="#0a0e1a" />
      <circle cx="16" cy="16" r="5" fill="#0a0e1a" />
      <circle cx="16" cy="16" r="3" fill="#f4f6fb" />
    </svg>
    <p class="font-display text-sm tracking-widest text-dim">{{ label }}</p>
  </div>
</template>
