export const dexNo = (n) => '#' + String(n).padStart(3, '0')

export const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s)

export const statTotal = (stats) => Object.values(stats).reduce((a, b) => a + b, 0)

export const STAT_LABELS = { hp: 'HP', atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed' }
export const STAT_ORDER = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']

/** Color a base stat value on the classic 0–180 scale. */
export function statColor(v) {
  if (v < 50) return '#e0564b'
  if (v < 75) return '#eb9c46'
  if (v < 100) return '#e8cf45'
  if (v < 125) return '#7ac74c'
  return '#4dd3c0'
}

// full digits, not ½/¼ precomposed glyphs — those render tiny at any font size
export const fmtMult = (m) => (m === 0.5 ? '0.5' : m === 0.25 ? '0.25' : String(m))
