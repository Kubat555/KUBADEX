// EV hotspots: where to grind effort values of one stat in one version.

// Encounters that happen once per save file: a static or gift Pokémon, a roaming legendary that is gone once knocked
// out, an in-game trade. They cannot be farmed, so they never make a hotspot (New Mauville's static Electrode used
// to top Emerald Speed).
const ONE_TIME_METHODS = new Set([
  'only-one',
  'gift',
  'gift-egg',
  'pokeflute',
  'devon-scope',
  'wailmer-pail',
  'npc-trade',
  'roaming-grass',
  'roaming-water',
])

// a place whose best method yields less than this per encounter is not worth listing
const MIN_EV = 0.1

/**
 * Places of `region` ranked by expected EVs of `stat` per wild encounter in `version`, best first.
 * Per place and encounter method: EV = Σ over its slots (chance / 100 × EV yield of `stat`); the place is ranked by
 * its best method. `mons` are the Pokémon of that method that yield the stat, biggest share of the EVs first.
 *
 * @param {object} p
 * @param {object} p.byLoc      encounters-by-location.json: { [region]: { [slug]: { label, versions: { [version]: mons } } } }
 * @param {object} p.indexById  { [id]: index entry with `evYield` }
 * @returns {Array<{ slug: string, label: string, method: string, ev: number,
 *                   mons: Array<{ id: number, name: string, chance: number, yield: number }> }>}
 */
export function rankHotspots({ byLoc, indexById, region, version, stat, limit = 12 }) {
  const out = []
  for (const [slug, loc] of Object.entries(byLoc?.[region] ?? {})) {
    const mons = loc.versions?.[version]
    if (!mons) continue
    const perMethod = {} // method -> { ev, mons: Map(id -> mon) }
    for (const mon of mons) {
      const yieldVal = indexById[mon.id]?.evYield?.[stat] ?? 0
      if (!yieldVal) continue
      for (const m of mon.methods) {
        if (ONE_TIME_METHODS.has(m.method)) continue
        const agg = (perMethod[m.method] ??= { ev: 0, mons: new Map() })
        agg.ev += (m.chance / 100) * yieldVal
        const cur = agg.mons.get(mon.id)
        if (!cur || cur.chance < m.chance) agg.mons.set(mon.id, { id: mon.id, name: mon.name, chance: m.chance, yield: yieldVal })
      }
    }
    const best = Object.entries(perMethod).sort((a, b) => b[1].ev - a[1].ev)[0]
    if (!best || best[1].ev < MIN_EV) continue
    out.push({
      slug,
      label: loc.label,
      method: best[0],
      ev: best[1].ev,
      mons: [...best[1].mons.values()].sort((a, b) => b.chance * b.yield - a.chance * a.yield),
    })
  }
  return out.sort((a, b) => b.ev - a.ev).slice(0, limit)
}
