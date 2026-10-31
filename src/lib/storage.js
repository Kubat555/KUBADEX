// Safe wrappers around localStorage / sessionStorage. Browsers can refuse storage
// (Safari private mode, blocked site data, quota), so nothing here ever throws:
// a failed read returns the fallback, a failed write is silently dropped.

export const KEY_PREFIX = 'kubadex:v2:'

// Even touching window.localStorage can throw (SecurityError), so the lookup is guarded too.
function getArea(area) {
  try {
    return area === 'session' ? window.sessionStorage : window.localStorage
  } catch {
    return null
  }
}

// `key` is given without the prefix; `area` is 'local' (default) or 'session'.
export function readJSON(key, fallback, area = 'local') {
  try {
    const raw = getArea(area)?.getItem(KEY_PREFIX + key)
    return raw == null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function writeJSON(key, value, area = 'local') {
  try {
    getArea(area)?.setItem(KEY_PREFIX + key, JSON.stringify(value))
  } catch {
    // storage unavailable or full: the value just won't persist
  }
}

// ---- one-time migration of the pre-v2 `dex3-*` keys ----

function parseJSON(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

function currentPrefs() {
  const saved = readJSON('prefs', {})
  return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {}
}

// [legacy key, new key (without prefix), convert(raw) -> value to store, or undefined to drop it]
const LEGACY = [
  ['dex3-version', 'prefs', (raw) => ({ ...currentPrefs(), version: raw })],
  ['dex3-team', 'team', parseJSON],
  ['dex3-streak', 'wtp-streak', (raw) => (Number.isFinite(Number(raw)) ? Number(raw) : undefined)],
  ['dex3-wtp', 'wtp-daily', parseJSON],
]

// Moves each legacy key to its v2 home and removes it; once the old keys are gone, calling it again does nothing.
export function migrateLegacy() {
  const area = getArea('local')
  if (!area) return
  for (const [legacyKey, key, convert] of LEGACY) {
    try {
      const raw = area.getItem(legacyKey)
      if (raw === null) continue
      const value = convert(raw)
      // written directly (not via writeJSON) so a refused write keeps the legacy key for the next load
      if (value !== undefined && value !== null) area.setItem(KEY_PREFIX + key, JSON.stringify(value))
      area.removeItem(legacyKey)
    } catch {
      // storage refused: leave the legacy key in place and try again on the next load
    }
  }
}
