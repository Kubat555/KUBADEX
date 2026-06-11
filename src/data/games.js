// The five Gen 3 versions, in release-pair order.
export const GAMES = {
  ruby: { id: 'ruby', label: 'Ruby', short: 'R', color: '#e0344f', vg: 'ruby-sapphire', region: 'hoenn' },
  sapphire: { id: 'sapphire', label: 'Sapphire', short: 'S', color: '#3b6ee0', vg: 'ruby-sapphire', region: 'hoenn' },
  emerald: { id: 'emerald', label: 'Emerald', short: 'E', color: '#2fb86e', vg: 'emerald', region: 'hoenn' },
  firered: { id: 'firered', label: 'FireRed', short: 'FR', color: '#ff7327', vg: 'firered-leafgreen', region: 'kanto' },
  leafgreen: { id: 'leafgreen', label: 'LeafGreen', short: 'LG', color: '#34c178', vg: 'firered-leafgreen', region: 'kanto' },
}

export const GAME_ORDER = ['ruby', 'sapphire', 'emerald', 'firered', 'leafgreen']

export const VERSION_GROUPS = {
  'ruby-sapphire': { label: 'Ruby / Sapphire', short: 'R·S', color: '#c84a64' },
  emerald: { label: 'Emerald', short: 'EM', color: '#2fb86e' },
  'firered-leafgreen': { label: 'FireRed / LeafGreen', short: 'FR·LG', color: '#ff7327' },
}

export const VG_ORDER = ['ruby-sapphire', 'emerald', 'firered-leafgreen']

export const METHOD_LABELS = {
  walk: 'Grass / Cave',
  surf: 'Surfing',
  'old-rod': 'Old Rod',
  'good-rod': 'Good Rod',
  'super-rod': 'Super Rod',
  'rock-smash': 'Rock Smash',
  gift: 'Gift',
  'gift-egg': 'Gift Egg',
  'only-one': 'Static',
  'feebas-tile-fishing': 'Fishing — 6 hidden tiles',
  'seaweed': 'Seaweed (dive)',
}

export const METHOD_ICONS = {
  walk: '🌿',
  surf: '🌊',
  'old-rod': '🎣',
  'good-rod': '🎣',
  'super-rod': '🎣',
  'rock-smash': '🪨',
  gift: '🎁',
  'gift-egg': '🥚',
  'only-one': '★',
  'feebas-tile-fishing': '🎣',
  'seaweed': '🌊',
}
