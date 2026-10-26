// Unified search: one normalizer and one ranking for every place that looks a pokemon up
// by what the user typed (header search, pickers, "Who's that Pokemon?" answers).

/**
 * Fold a string into a comparison key: lowercase, no diacritics, no punctuation or spaces.
 * Gender signs become letters (Nidoran♀ -> nidoranf) and Russian ё is folded to е.
 * Only [a-z0-9а-я] survive. Russian й is kept: only marks sitting on Latin letters are stripped.
 */
export function normalize(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/♀/g, 'f')
    .replace(/♂/g, 'm')
    .normalize('NFD')
    .replace(/([a-z])[̀-ͯ]+/g, '$1')
    .normalize('NFC') // glues й back together; ё comes back as one char and is folded next
    .replace(/ё/g, 'е')
    .replace(/[^a-z0-9а-я]/g, '')
}

// "#025", "025", "25", "no.25", "No. 25", "№25"
const DEX_NUMBER = /^\s*(?:#|no\.?|№)?\s*(\d{1,4})\s*$/i

/** The national dex number a query asks for, or null when the query is not a number. */
export function parseDexNumber(q) {
  const m = DEX_NUMBER.exec(String(q ?? ''))
  if (!m) return null
  const n = Number(m[1])
  return n > 0 ? n : null
}

/**
 * Damerau–Levenshtein distance (adjacent swaps cost 1) between a and b.
 * Gives up early: any result above `max` is reported as `max + 1`.
 */
export function distance(a, b, max) {
  if (a === b) return 0
  const n = a.length
  const m = b.length
  if (Math.abs(n - m) > max) return max + 1
  if (n === 0 || m === 0) return Math.max(n, m)

  let prev2 = new Array(m + 1) // row i-2 (needed for swaps)
  let prev = Array.from({ length: m + 1 }, (_, j) => j) // row i-1
  let cur = new Array(m + 1) // row i
  let prevMin = 0
  for (let i = 1; i <= n; i++) {
    cur[0] = i
    let curMin = i
    for (let j = 1; j <= m; j++) {
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prev2[j - 2] + 1)
      }
      cur[j] = v
      if (v < curMin) curMin = v
    }
    // a swap reaches two rows back, so every later row stays above max only if the last two rows do
    if (curMin > max && prevMin > max) return max + 1
    ;[prev2, prev, cur] = [prev, cur, prev2]
    prevMin = curMin
  }
  return Math.min(prev[m], max + 1)
}

/** Label without the default-form suffix ('Deoxys Normal' -> 'Deoxys'). Temporary until stage 2 data. */
export function speciesLabel(p) {
  return String(p.label ?? '').replace(/\s+Normal$/, '')
}

/** Is the typed WTP guess the pokemon? Exact match after normalize; a guess is not a fuzzy search. */
export function isGuessCorrect(guess, p) {
  const g = normalize(guess)
  if (!g) return false
  return g === normalize(p.name) || g === normalize(p.label) || g === normalize(speciesLabel(p))
}

const WORD_SPLIT = /[\s\-.'’]+/

// Search keys are built once per index array: the index is loaded once and never mutated.
const keyCache = new WeakMap()

function buildKeys(p) {
  const species = speciesLabel(p)
  const names = new Set([normalize(p.name), normalize(p.label), normalize(species)])
  names.delete('')
  const words = new Set()
  for (const src of [p.name, p.label]) {
    for (const w of String(src ?? '').split(WORD_SPLIT)) {
      const k = normalize(w)
      if (k) words.add(k)
    }
  }
  return { names: [...names], words: [...words] }
}

function getKeys(index) {
  let keys = keyCache.get(index)
  if (!keys) {
    keys = index.map(buildKeys)
    keyCache.set(index, keys)
  }
  return keys
}

// Lower is better: 0 dex number, 1 exact name, 2 prefix, 3 word prefix, 4 substring,
// 5 typo (distance 1), 6 typo (distance 2). -1 = no match.
function rankOf(p, keys, q, num, maxTypo) {
  if (num !== null && p.id === num) return 0
  const { names, words } = keys
  if (names.includes(q)) return 1
  if (names.some((k) => k.startsWith(q))) return 2
  if (words.some((w) => w.startsWith(q))) return 3
  if (names.some((k) => k.includes(q))) return 4
  if (maxTypo > 0) {
    let best = maxTypo + 1
    for (const k of names) best = Math.min(best, distance(q, k, maxTypo))
    if (best <= maxTypo) return 4 + best
  }
  return -1
}

/**
 * Pokemon from `index` ({id, name, label}) that match what the user typed, best first.
 * Ranking: dex number > exact name > prefix > word prefix > substring > typo, then by id.
 * Typos: 1 edit for queries of 4–6 characters, 2 edits for 7+, none for shorter ones.
 */
export function searchPokemon(index, query, { limit = 8 } = {}) {
  const q = normalize(query)
  if (!q) return []
  const num = parseDexNumber(query)
  const maxTypo = q.length >= 7 ? 2 : q.length >= 4 ? 1 : 0
  const keys = getKeys(index)

  const hits = []
  for (let i = 0; i < index.length; i++) {
    const rank = rankOf(index[i], keys[i], q, num, maxTypo)
    if (rank >= 0) hits.push({ p: index[i], rank })
  }
  hits.sort((a, b) => a.rank - b.rank || a.p.id - b.p.id)
  return hits.slice(0, limit).map((h) => h.p)
}
