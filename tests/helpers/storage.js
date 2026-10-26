import { vi } from 'vitest'

const denied = (name = 'SecurityError') => () => { throw new DOMException('denied', name) }

// Swaps window.localStorage for a stand-in whose listed methods throw; the other methods pass through to the real storage.
// (Spying on Storage.prototype is unreliable under happy-dom, which caches bound methods per instance.)
export function breakLocalStorage(...methods) {
  const real = window.localStorage
  const stand = {
    getItem: (k) => real.getItem(k),
    setItem: (k, v) => real.setItem(k, v),
    removeItem: (k) => real.removeItem(k),
  }
  for (const m of methods) stand[m] = denied(m === 'setItem' ? 'QuotaExceededError' : 'SecurityError')
  vi.spyOn(window, 'localStorage', 'get').mockReturnValue(stand)
}

// Makes merely reading window.localStorage / window.sessionStorage throw, as some browsers do when site data is blocked.
export function blockStorageAccess() {
  vi.spyOn(window, 'localStorage', 'get').mockImplementation(denied())
  vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(denied())
}
