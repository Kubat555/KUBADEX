<script setup>
// 404: an unknown address (catch-all route) or a Pokémon number past the end of the dex (PokemonView renders it in place).
import { useI18n } from 'vue-i18n'
import EmptyState from '../components/ui/EmptyState.vue'

defineProps({
  hint: { type: String, default: null }, // replaces the generic hint, e.g. "no Pokémon #9999"
})

const { t } = useI18n()
</script>

<template>
  <div class="mx-auto max-w-2xl py-6">
    <EmptyState :title="t('errors.notFound')" :hint="hint ?? t('errors.notFoundHint')">
      <template #actions>
        <RouterLink
          to="/"
          class="inline-flex h-10 items-center rounded-lg border border-line-strong bg-surface-2 px-4 font-display text-sm uppercase tracking-wider text-ink transition-colors duration-(--dur-1) hover:border-dexglow active:translate-y-px"
        >{{ t('errors.toPokedex') }}</RouterLink>
      </template>
    </EmptyState>
  </div>
</template>
