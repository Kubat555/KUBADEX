<script setup>
// RU/EN in the header: a compact radio group bound to the saved language.
import { useI18n } from 'vue-i18n'
import { setLocale } from '../i18n'
import { usePrefsStore } from '../stores/prefs'
import Segmented from './ui/Segmented.vue'

const OPTIONS = [
  { value: 'ru', label: 'RU' },
  { value: 'en', label: 'EN' },
]

const { t } = useI18n()
const prefs = usePrefsStore()
</script>

<template>
  <Segmented size="sm" :model-value="prefs.locale" :options="OPTIONS" :label="t('settings.language')" @update:model-value="setLocale" />
</template>
