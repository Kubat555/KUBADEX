import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { migrateLegacy } from './lib/storage'
import { usePrefsStore } from './stores/prefs'
import '@fontsource-variable/onest'
import '@fontsource-variable/pixelify-sans'
import './styles/main.css'

migrateLegacy() // move pre-v2 `dex3-*` keys before any store reads storage

const pinia = createPinia()
const app = createApp(App).use(pinia).use(router)
usePrefsStore(pinia) // create it up front so <html lang>/<html data-motion> are set on every route, not only where a view reads prefs
app.mount('#app')
