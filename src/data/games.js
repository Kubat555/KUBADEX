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
  'ruby-sapphire': { label: 'Ruby / Sapphire' },
  emerald: { label: 'Emerald' },
  'firered-leafgreen': { label: 'FireRed / LeafGreen' },
}

// Encounter method -> pixel icon name for <Icon :name>. A method without an entry shows no icon.
export const METHOD_ICON_NAMES = {
  walk: 'grass',
  surf: 'wave',
  'old-rod': 'rod',
  'good-rod': 'rod',
  'super-rod': 'rod',
  'rock-smash': 'rock',
  gift: 'gift',
  'gift-egg': 'egg',
  'only-one': 'star',
  'feebas-tile-fishing': 'rod',
  seaweed: 'wave',
}
