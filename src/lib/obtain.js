import { GAME_ORDER } from '../data/games'

// "How do I get it in this game?" when the Pokémon has no wild encounter of its own here.
// Hint = { kind: 'special', note } | { kind: 'evolve', fromId, fromLabel } | { kind: 'trade', versions } | { kind: 'none' }

/** Has wild encounters or a curated note (`specialFor`) in this version. */
const obtainableIn = (mon, version, specialFor) =>
  (mon.encounters?.[version]?.length ?? 0) > 0 || specialFor(mon.id, version).length > 0

/**
 * Hints in rule order: (1) curated notes for this version, only them; (2) wild here → none needed;
 * (3) evolve from the nearest ancestor obtainable here; (4) trade from the versions (GAME_ORDER) where the
 * Pokémon or any ancestor is obtainable; (5) nothing known.
 * @param p          pokemon detail JSON
 * @param version    game version id
 * @param ancestors  details of its pre-evolutions, nearest first (empty when it has none)
 * @param specialFor (id, version) → Array<{ note }>
 */
export function obtainHints({ p, version, ancestors, specialFor }) {
  const notes = specialFor(p.id, version)
  if (notes.length) return notes.map(({ note }) => ({ kind: 'special', note }))
  if (p.encounters?.[version]?.length) return []

  const from = ancestors.find((a) => obtainableIn(a, version, specialFor))
  if (from) return [{ kind: 'evolve', fromId: from.id, fromLabel: from.label }]

  const family = [p, ...ancestors]
  const versions = GAME_ORDER.filter((v) => v !== version && family.some((m) => obtainableIn(m, v, specialFor)))
  if (versions.length) return [{ kind: 'trade', versions }]

  return [{ kind: 'none' }]
}

/**
 * Ids of the pre-evolutions of `id` in an evolution chain (root node), nearest first; [] for the root or an unknown id.
 * Members outside this dex (later-generation babies such as Munchlax) have `id: null` and are skipped.
 */
export function ancestorIds(chain, id) {
  const walk = (node, path) => {
    if (node.id === id) return path
    for (const next of node.evolvesTo ?? []) {
      const found = walk(next, node.id == null ? path : [node.id, ...path])
      if (found) return found
    }
    return null
  }
  return chain ? walk(chain, []) ?? [] : []
}
