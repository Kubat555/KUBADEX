// Static dataset loaders with in-memory caching.
const cache = new Map()

function load(path) {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(import.meta.env.BASE_URL + path)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          // The host's SPA rewrite answers a missing JSON file with the HTML shell and status 200.
          if (!(r.headers.get('content-type') || '').includes('json')) throw new Error('response is not JSON')
          return r.json()
        })
        .catch((cause) => {
          // Never keep a failed request cached, otherwise a transient error sticks until reload.
          cache.delete(path)
          throw new Error(`Failed to load ${path}`, { cause })
        }),
    )
  }
  return cache.get(path)
}

export const loadIndex = () => load('data/index.json')
export const loadMoves = () => load('data/moves.json')
export const loadAbilities = () => load('data/abilities.json')
export const loadByLocation = () => load('data/encounters-by-location.json')
export const loadLearners = () => load('data/move-learners.json')
export const loadPokemon = (id) => load(`data/pokemon/${id}.json`)

export const spriteUrl = (id, kind = 'gen3') => `${import.meta.env.BASE_URL}sprites/${kind}/${id}.png`
export const cryUrl = (id) => `${import.meta.env.BASE_URL}cries/${id}.ogg`
