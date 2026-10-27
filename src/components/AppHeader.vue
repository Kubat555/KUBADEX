<script setup>
// Phone (< 640px): logo and RU/EN only, the menu lives in the bottom bar.
// Wider: logo, menu, search (opens the palette), RU/EN, settings — one row, never wrapping:
// 640–1023px shows short menu labels and an icon-only search button.
import { useI18n } from 'vue-i18n'
import { useNavLinks } from '../composables/useNavLinks'
import Icon from './ui/Icon.vue'
import LocaleSwitch from './LocaleSwitch.vue'

const emit = defineEmits(['search'])

const MENU = ['pokedex', 'map', 'moves', 'bosses', 'ev', 'compare', 'team']
// labels for 640–1023px; no aria-label: the hidden label is display:none, so the accessible name is the one on screen
const SHORT = { pokedex: 'nav.short.pokedex', compare: 'nav.short.compare' }

const { t } = useI18n()
const { to, section } = useNavLinks()

const logoUrl = `${import.meta.env.BASE_URL}favicon.svg`
const isApple = /mac|iphone|ipad|ipod/i.test(navigator.userAgentData?.platform || navigator.platform || '') // 'macOS', 'MacIntel'
const shortcut = isApple ? '⌘K' : 'Ctrl K'
</script>

<template>
  <header class="z-40 border-b border-line bg-bg/85 backdrop-blur-md sm:sticky sm:top-0">
    <div class="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 lg:gap-3">
      <RouterLink :to="to.pokedex" aria-label="KUBADEX" class="group flex shrink-0 items-center gap-2.5 rounded-lg">
        <img
          :src="logoUrl"
          alt=""
          width="32"
          height="32"
          class="size-8 drop-shadow-[0_0_10px_rgba(227,53,13,0.45)] transition-transform duration-(--dur-3) group-hover:rotate-[20deg]"
        />
        <span class="font-display text-2xl tracking-wide text-ink transition-colors duration-(--dur-2) group-hover:text-dexglow sm:max-md:hidden">KUBADEX</span>
        <span aria-hidden="true" class="ml-1 hidden gap-1 xl:flex">
          <span class="size-1.5 rounded-full bg-dex animate-blink" />
          <span class="size-1.5 rounded-full bg-type-electric" />
          <span class="size-1.5 rounded-full bg-type-grass" />
        </span>
      </RouterLink>

      <nav :aria-label="t('nav.main')" class="ml-auto hidden sm:block">
        <ul class="flex items-center">
          <li v-for="name in MENU" :key="name">
            <RouterLink
              :to="to[name]"
              class="relative flex h-9 items-center rounded-md px-1 font-display text-base uppercase tracking-normal whitespace-nowrap transition-colors duration-(--dur-1) lg:px-2"
              :class="section === name ? 'text-ink' : 'text-muted hover:text-ink'"
            >
              <template v-if="SHORT[name]">
                <span class="lg:hidden">{{ t(SHORT[name]) }}</span>
                <span class="hidden lg:inline">{{ t(`nav.${name}`) }}</span>
              </template>
              <template v-else>{{ t(`nav.${name}`) }}</template>
              <span v-if="section === name" aria-hidden="true" class="absolute inset-x-1 bottom-0.5 h-0.5 bg-dexglow lg:inset-x-2" />
            </RouterLink>
          </li>
        </ul>
      </nav>

      <button
        type="button"
        :aria-label="t('common.search')"
        :title="t('common.search')"
        aria-haspopup="dialog"
        aria-keyshortcuts="Control+K Meta+K /"
        class="hidden h-8 min-w-8 items-center justify-center gap-2 rounded-lg border border-line-strong bg-surface-1 text-sm text-muted transition-colors duration-(--dur-1) hover:text-ink sm:flex lg:pr-1.5 lg:pl-2.5"
        @click="emit('search')"
      >
        <Icon name="search" />
        <span class="hidden lg:inline">{{ t('search.button') }}</span>
        <kbd aria-hidden="true" class="ml-2 hidden rounded border border-line px-1.5 py-1 font-body text-xs leading-none text-dim lg:inline pointer-coarse:hidden">{{ shortcut }}</kbd>
      </button>

      <LocaleSwitch class="ml-auto sm:ml-0" />

      <RouterLink
        :to="to.settings"
        :aria-label="t('nav.settings')"
        :title="t('nav.settings')"
        class="hidden size-8 place-items-center rounded-lg transition-colors duration-(--dur-1) sm:grid"
        :class="section === 'settings' ? 'bg-surface-2 text-ink' : 'text-muted hover:text-ink'"
      >
        <Icon name="settings" />
      </RouterLink>
    </div>
  </header>
</template>
