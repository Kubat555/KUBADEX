<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { setLocale } from '../i18n'
import { usePrefsStore } from '../stores/prefs'
import PageHeader from '../components/ui/PageHeader.vue'
import Segmented from '../components/ui/Segmented.vue'

// each language is named in itself, so it can be found whatever the current UI language
const LANGUAGES = [
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
]

const { t } = useI18n()
const prefs = usePrefsStore()

const motionOptions = computed(() => [
  { value: 'system', label: t('settings.motionSystem') },
  { value: 'reduce', label: t('settings.motionReduce') },
  { value: 'full', label: t('settings.motionFull') },
])
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <PageHeader :title="t('nav.settings')">{{ t('settings.saved') }}</PageHeader>

    <div class="divide-y divide-line rounded-2xl border border-line bg-surface-1">
      <section class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 p-4 sm:p-5">
        <h2 class="eyebrow">{{ t('settings.language') }}</h2>
        <Segmented :model-value="prefs.locale" :options="LANGUAGES" :label="t('settings.language')" @update:model-value="setLocale" />
      </section>

      <section class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 p-4 sm:p-5">
        <div class="min-w-0 max-w-sm">
          <h2 class="eyebrow">{{ t('settings.motion') }}</h2>
          <p class="mt-1 text-sm text-muted text-pretty">{{ t('settings.motionHint') }}</p>
        </div>
        <Segmented v-model="prefs.motion" :options="motionOptions" :label="t('settings.motion')" />
      </section>
    </div>
  </div>
</template>
