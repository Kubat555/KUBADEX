import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { migrateLegacy } from './lib/storage'
import { usePrefsStore } from './stores/prefs'
import { i18n, setLocale } from './i18n'
import '@fontsource-variable/onest'
import './styles/main.css'

migrateLegacy() // move pre-v2 `dex3-*` keys before any store reads storage

const pinia = createPinia()
const app = createApp(App).use(pinia).use(router).use(i18n)
const prefs = usePrefsStore(pinia) // create it up front so <html lang>/<html data-motion> are set on every route, not only where a view reads prefs
setLocale(prefs.locale) // i18n starts as 'en'; switch it to the saved or detected language before the first render
app.mount('#app')
