import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    // precompiles the locale dictionaries at build time, so the message compiler stays out of the bundle
    VueI18nPlugin({ include: fileURLToPath(new URL('./src/i18n/locales/**', import.meta.url)) }),
  ],
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.js'],
  },
})
