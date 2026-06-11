// Static dataset loaders with in-memory caching.
const cache = new Map()

function load(path) {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(import.meta.env.BASE_URL + path).then((r) => {
        if (!r.ok) throw new Error(`Failed to load ${path}`)
        return r.json()
      }),
    )
  }
  return cache.get(path)
}

export const loadIndex = () => load('data/index.json')
export const loadMoves = () => load('data/moves.json')
export const loadAbilities = () => load('data/abilities.json')
export const loadByLocation = () => load('data/encounters-by-location.json')
export const loadPokemon = (id) => load(`data/pokemon/${id}.json`)

export const spriteUrl = (id, kind = 'gen3') => `${import.meta.env.BASE_URL}sprites/${kind}/${id}.png`
