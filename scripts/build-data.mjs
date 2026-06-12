// Builds the static Gen 3 dataset from PokeAPI into public/data + public/sprites.
// Rerunnable: raw API responses are cached on disk in scripts/.cache.
import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CACHE = path.join(ROOT, 'scripts', '.cache')
const DATA = path.join(ROOT, 'public', 'data')
const SPRITES = path.join(ROOT, 'public', 'sprites')

const MAX_ID = 386
const VERSIONS = ['ruby', 'sapphire', 'emerald', 'firered', 'leafgreen']
const VERSION_GROUPS = ['ruby-sapphire', 'emerald', 'firered-leafgreen']
// In Gen 3 the physical/special split is per-type, not per-move.
const PHYSICAL_TYPES = new Set(['normal', 'fighting', 'flying', 'ground', 'rock', 'bug', 'ghost', 'poison', 'steel'])

const exists = (p) => access(p).then(() => true, () => false)

async function fetchRetry(url, asJson = true) {
  let lastErr
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url)
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
      return asJson ? await res.json() : Buffer.from(await res.arrayBuffer())
    } catch (err) {
      lastErr = err
      await new Promise((r) => setTimeout(r, attempt * 1500))
    }
  }
  throw lastErr
}

async function getJson(url) {
  const key = createHash('md5').update(url).digest('hex')
  const file = path.join(CACHE, key + '.json')
  if (await exists(file)) return JSON.parse(await readFile(file, 'utf8'))
  const json = await fetchRetry(url)
  await writeFile(file, JSON.stringify(json))
  return json
}

async function pool(items, limit, fn) {
  const results = new Array(items.length)
  let next = 0
  let done = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i], i)
      if (++done % 50 === 0) process.stdout.write(`  ${done}/${items.length}\n`)
    }
  }
  await Promise.all(Array.from({ length: limit }, worker))
  return results
}

const cap = (s) =>
  s.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
    .replace('Ho Oh', 'Ho-Oh').replace(/^Mr /, 'Mr. ').replace('Mime Jr', 'Mime Jr.')
    .replace('Farfetchd', "Farfetch'd").replace(/ F$/, '-F').replace(/ M$/, '-M')

const en = (arr) => arr?.find((e) => e.language.name === 'en')
const cleanText = (s) => s.replace(/[\f\n\r]+/g, ' ').replace(/\s+/g, ' ').trim()

const GEN_NUM = {
  'generation-i': 1, 'generation-ii': 2, 'generation-iii': 3, 'generation-iv': 4,
  'generation-v': 5, 'generation-vi': 6, 'generation-vii': 7, 'generation-viii': 8, 'generation-ix': 9,
}

// Types as they were in Gen 3 (e.g. Gardevoir was pure Psychic — no Fairy yet).
// past_types entries mean "had these types up to and including that generation".
function gen3Types(pokemon) {
  const applicable = (pokemon.past_types ?? [])
    .filter((pt) => GEN_NUM[pt.generation.name] >= 3)
    .sort((a, b) => GEN_NUM[a.generation.name] - GEN_NUM[b.generation.name])[0]
  const source = applicable ? applicable.types : pokemon.types
  return source.map((t) => t.type.name)
}

// Fairy didn't exist in Gen 3 — retyped moves (Charm, Moonlight, Sweet Kiss) were Normal.
const gen3MoveType = (t) => (t === 'fairy' ? 'normal' : t)

function gen3DamageClass(move) {
  if (move.damage_class?.name === 'status') return 'status'
  return PHYSICAL_TYPES.has(gen3MoveType(move.type.name)) ? 'physical' : 'special'
}

function evoCondition(detail) {
  if (!detail) return ''
  const parts = []
  const t = detail.trigger?.name
  if (t === 'level-up') {
    if (detail.min_level) parts.push(`Level ${detail.min_level}`)
    else parts.push('Level up')
  } else if (t === 'use-item') parts.push(cap(detail.item?.name ?? 'item'))
  else if (t === 'trade') parts.push('Trade')
  else if (t === 'shed') parts.push('Level 20, empty party slot + Poké Ball')
  else if (t) parts.push(cap(t))
  if (detail.held_item) parts.push(`holding ${cap(detail.held_item.name)}`)
  if (detail.min_happiness) parts.push('high Friendship')
  if (detail.min_beauty) parts.push(`Beauty ≥ ${detail.min_beauty}`)
  if (detail.time_of_day) parts.push(`(${detail.time_of_day}time)`)
  if (detail.location) parts.push(`at ${cap(detail.location.name)}`)
  if (detail.known_move) parts.push(`knowing ${cap(detail.known_move.name)}`)
  if (detail.relative_physical_stats === 1) parts.push('Atk > Def')
  if (detail.relative_physical_stats === -1) parts.push('Atk < Def')
  if (detail.relative_physical_stats === 0) parts.push('Atk = Def')
  if (detail.gender === 1) parts.push('(female)')
  if (detail.gender === 2) parts.push('(male)')
  return parts.join(', ').replace(', holding', ' holding').replace(', (', ' (')
}

async function main() {
  await Promise.all([
    mkdir(CACHE, { recursive: true }),
    mkdir(path.join(DATA, 'pokemon'), { recursive: true }),
    ...['art', 'gen3', 'frlg', 'shiny', 'icons'].map((d) => mkdir(path.join(SPRITES, d), { recursive: true })),
    mkdir(path.join(ROOT, 'public', 'cries'), { recursive: true }),
  ])

  const ids = Array.from({ length: MAX_ID }, (_, i) => i + 1)

  console.log('Fetching pokemon, species, encounters…')
  const base = await pool(ids, 10, async (id) => {
    const [pokemon, species, encounters] = await Promise.all([
      getJson(`https://pokeapi.co/api/v2/pokemon/${id}`),
      getJson(`https://pokeapi.co/api/v2/pokemon-species/${id}`),
      getJson(`https://pokeapi.co/api/v2/pokemon/${id}/encounters`),
    ])
    return { pokemon, species, encounters }
  })

  // ---- collect unique secondary resources ----
  const moveNames = new Set()
  const abilityNames = new Set()
  const chainUrls = new Set()
  const areaUrls = new Set()
  for (const { pokemon, species, encounters } of base) {
    for (const m of pokemon.moves)
      if (m.version_group_details.some((d) => VERSION_GROUPS.includes(d.version_group.name)))
        moveNames.add(m.move.name)
    for (const a of pokemon.abilities) if (!a.is_hidden) abilityNames.add(a.ability.name)
    if (species.evolution_chain?.url) chainUrls.add(species.evolution_chain.url)
    for (const enc of encounters)
      if (enc.version_details.some((v) => VERSIONS.includes(v.version.name)))
        areaUrls.add(enc.location_area.url)
  }

  console.log(`Fetching ${areaUrls.size} location areas…`)
  const areas = await pool([...areaUrls], 10, (u) => getJson(u))
  const areaInfo = new Map() // area name -> {label, locUrl}
  const locUrls = new Set()
  for (const a of areas) {
    areaInfo.set(a.name, { label: en(a.names)?.name || cap(a.name), locUrl: a.location.url })
    locUrls.add(a.location.url)
  }

  console.log(`Fetching ${locUrls.size} locations…`)
  const locs = await pool([...locUrls], 10, (u) => getJson(u))
  const locInfo = new Map() // url -> {slug, label, region}
  for (let i = 0; i < locs.length; i++) {
    const l = locs[i]
    locInfo.set([...locUrls][i], {
      slug: l.name,
      label: en(l.names)?.name || cap(l.name),
      region: l.region?.name ?? 'unknown',
    })
  }

  console.log(`Fetching ${moveNames.size} moves…`)
  const moveList = await pool([...moveNames], 10, (n) => getJson(`https://pokeapi.co/api/v2/move/${n}`))

  // TM/HM numbers per version group
  const machineRefs = []
  for (const m of moveList)
    for (const mc of m.machines ?? [])
      if (VERSION_GROUPS.includes(mc.version_group.name)) machineRefs.push({ move: m.name, vg: mc.version_group.name, url: mc.machine.url })
  console.log(`Fetching ${machineRefs.length} TM/HM machines…`)
  const machineData = await pool(machineRefs, 10, (r) => getJson(r.url))
  const machinesByMove = {} // move -> { vg: 'TM24' }
  machineRefs.forEach((r, i) => {
    const item = machineData[i]?.item?.name
    if (!item) return
    ;(machinesByMove[r.move] ??= {})[r.vg] = item.toUpperCase() // tm24 -> TM24
  })

  const movesOut = {}
  for (const m of moveList) {
    movesOut[m.name] = {
      machines: machinesByMove[m.name] ?? undefined,
      label: en(m.names)?.name || cap(m.name),
      type: gen3MoveType(m.type.name),
      class: gen3DamageClass(m),
      power: m.power,
      accuracy: m.accuracy,
      pp: m.pp,
      effect: cleanText(en(m.effect_entries)?.short_effect?.replace('$effect_chance', String(m.effect_chance ?? '')) ?? ''),
    }
  }

  console.log(`Fetching ${abilityNames.size} abilities…`)
  const abilityList = await pool([...abilityNames], 10, (n) => getJson(`https://pokeapi.co/api/v2/ability/${n}`))
  const abilitiesOut = {}
  for (const a of abilityList) {
    abilitiesOut[a.name] = {
      label: en(a.names)?.name || cap(a.name),
      effect: cleanText(en(a.effect_entries)?.short_effect ?? en(a.flavor_text_entries)?.flavor_text ?? ''),
    }
  }

  console.log(`Fetching ${chainUrls.size} evolution chains…`)
  const chains = await pool([...chainUrls], 10, (u) => getJson(u))
  const chainBySpecies = new Map() // species name -> chain root
  const idByName = new Map(base.map(({ pokemon }) => [pokemon.name, pokemon.id]))
  function buildNode(link) {
    const id = idByName.get(link.species.name) ?? null
    return {
      id,
      name: link.species.name,
      label: cap(link.species.name),
      evolvesTo: link.evolves_to
        .filter((e) => (idByName.get(e.species.name) ?? 999) <= MAX_ID)
        .map((e) => ({ ...buildNode(e), condition: evoCondition(e.evolution_details[0]) })),
    }
  }
  for (const c of chains) {
    const root = buildNode(c.chain)
    ;(function register(node) {
      chainBySpecies.set(node.name, root)
      node.evolvesTo.forEach(register)
    })(root)
  }

  // ---- assemble per-pokemon files + index + by-location ----
  console.log('Assembling JSON…')
  const index = []
  const byLocation = {} // region -> slug -> {label, versions: {v: {pokeId: {methods}}}}
  const moveLearners = {} // move -> vg -> [[pokemonId, method, level]]
  const statKeys = { hp: 'hp', attack: 'atk', defense: 'def', 'special-attack': 'spa', 'special-defense': 'spd', speed: 'spe' }

  for (const { pokemon, species, encounters } of base) {
    const stats = {}
    const evYield = {}
    for (const s of pokemon.stats) {
      stats[statKeys[s.stat.name]] = s.base_stat
      if (s.effort) evYield[statKeys[s.stat.name]] = s.effort
    }
    const dex = { national: pokemon.id }
    for (const d of species.pokedex_numbers) {
      if (d.pokedex.name === 'kanto') dex.kanto = d.entry_number
      if (d.pokedex.name === 'hoenn') dex.hoenn = d.entry_number
    }
    const flavor = {}
    for (const f of species.flavor_text_entries)
      if (f.language.name === 'en' && VERSIONS.includes(f.version.name) && !flavor[f.version.name])
        flavor[f.version.name] = cleanText(f.flavor_text)

    // encounters: version -> location slug -> methods
    const encOut = {}
    for (const enc of encounters) {
      const info = areaInfo.get(enc.location_area.name)
      if (!info) continue
      const loc = locInfo.get(info.locUrl)
      if (loc.slug.endsWith('-pokecenter')) continue // distribution-event artifacts, not real locations
      for (const vd of enc.version_details) {
        const v = vd.version.name
        if (!VERSIONS.includes(v)) continue
        encOut[v] ??= {}
        const entry = (encOut[v][loc.slug] ??= { label: loc.label, region: loc.region, methods: {} })
        for (const d of vd.encounter_details) {
          const m = d.method.name
          const cur = (entry.methods[m] ??= { min: d.min_level, max: d.max_level, chance: 0 })
          cur.min = Math.min(cur.min, d.min_level)
          cur.max = Math.max(cur.max, d.max_level)
          cur.chance = Math.min(100, cur.chance + d.chance)
        }
      }
    }
    // flatten to arrays
    const encounterData = {}
    for (const [v, locsMap] of Object.entries(encOut)) {
      encounterData[v] = Object.entries(locsMap).map(([slug, e]) => ({
        loc: slug,
        label: e.label,
        region: e.region,
        methods: Object.entries(e.methods).map(([m, x]) => ({ method: m, min: x.min, max: x.max, chance: x.chance })),
      }))
      for (const e of encounterData[v]) {
        const reg = (byLocation[e.region] ??= {})
        const locEntry = (reg[e.loc] ??= { label: e.label, versions: {} })
        ;(locEntry.versions[v] ??= []).push({ id: pokemon.id, name: cap(pokemon.name), methods: e.methods })
      }
    }

    const wildVersions = Object.keys(encounterData)
    let games = wildVersions
    if (!games.length) {
      games = []
      if (dex.kanto) games.push('firered', 'leafgreen')
      if (dex.hoenn) games.push('ruby', 'sapphire', 'emerald')
    }

    const detail = {
      id: pokemon.id,
      name: pokemon.name,
      label: cap(pokemon.name),
      genus: en(species.genera)?.genus ?? '',
      types: gen3Types(pokemon),
      stats,
      height: pokemon.height / 10,
      weight: pokemon.weight / 10,
      baseExp: pokemon.base_experience,
      dex,
      abilities: pokemon.abilities.filter((a) => !a.is_hidden).sort((a, b) => a.slot - b.slot).map((a) => a.ability.name),
      flavor,
      training: {
        catchRate: species.capture_rate,
        baseHappiness: species.base_happiness,
        growthRate: cap(species.growth_rate?.name ?? ''),
        hatchSteps: (species.hatch_counter + 1) * 255,
        evYield,
        genderFemale: species.gender_rate === -1 ? null : (species.gender_rate / 8) * 100,
        eggGroups: species.egg_groups.map((g) => cap(g.name)),
      },
      evolution: chainBySpecies.get(pokemon.name) ?? null,
      moves: pokemon.moves
        .map((m) => {
          const learn = {}
          for (const d of m.version_group_details) {
            const vg = d.version_group.name
            if (!VERSION_GROUPS.includes(vg)) continue
            ;(learn[vg] ??= []).push([d.move_learn_method.name, d.level_learned_at])
            ;((moveLearners[m.move.name] ??= {})[vg] ??= []).push([pokemon.id, d.move_learn_method.name, d.level_learned_at])
          }
          return Object.keys(learn).length ? { name: m.move.name, learn } : null
        })
        .filter(Boolean),
      encounters: encounterData,
      games,
      hasFrlgSprite: Boolean(pokemon.sprites.versions['generation-iii']['firered-leafgreen'].front_default),
    }
    await writeFile(path.join(DATA, 'pokemon', `${pokemon.id}.json`), JSON.stringify(detail))

    index.push({
      id: pokemon.id,
      name: pokemon.name,
      label: detail.label,
      genus: detail.genus,
      types: detail.types,
      stats,
      evYield,
      dex,
      games,
    })
  }

  index.sort((a, b) => a.id - b.id)
  await writeFile(path.join(DATA, 'index.json'), JSON.stringify(index))
  await writeFile(path.join(DATA, 'moves.json'), JSON.stringify(movesOut))
  await writeFile(path.join(DATA, 'abilities.json'), JSON.stringify(abilitiesOut))
  await writeFile(path.join(DATA, 'encounters-by-location.json'), JSON.stringify(byLocation))
  await writeFile(path.join(DATA, 'move-learners.json'), JSON.stringify(moveLearners))

  // report: all wild location slugs per region, to reconcile with the hand-made maps
  const report = {}
  for (const [region, locsMap] of Object.entries(byLocation)) report[region] = Object.keys(locsMap).sort()
  await writeFile(path.join(DATA, 'locations-report.json'), JSON.stringify(report, null, 2))

  // ---- sprites ----
  console.log('Downloading sprites…')
  await pool(base, 10, async ({ pokemon }) => {
    const v3 = pokemon.sprites.versions['generation-iii']
    const targets = [
      ['art', pokemon.sprites.other?.['official-artwork']?.front_default],
      ['gen3', v3.emerald.front_default ?? pokemon.sprites.front_default],
      ['frlg', v3['firered-leafgreen'].front_default],
      ['shiny', v3.emerald.front_shiny ?? pokemon.sprites.front_shiny],
      ['icons', pokemon.sprites.versions?.['generation-viii']?.icons?.front_default ?? pokemon.sprites.front_default],
    ]
    for (const [dir, url] of targets) {
      if (!url) continue
      const file = path.join(SPRITES, dir, `${pokemon.id}.png`)
      if (await exists(file)) continue
      const buf = await fetchRetry(url, false)
      if (buf) await writeFile(file, buf)
    }
    // GBA-era cry (legacy = pre-X/Y audio), used by the ▶ CRY button
    const cryUrl = pokemon.cries?.legacy ?? pokemon.cries?.latest
    if (cryUrl) {
      const cryFile = path.join(ROOT, 'public', 'cries', `${pokemon.id}.ogg`)
      if (!(await exists(cryFile))) {
        const buf = await fetchRetry(cryUrl, false)
        if (buf) await writeFile(cryFile, buf)
      }
    }
  })

  console.log(`Done. ${index.length} pokemon, ${Object.keys(movesOut).length} moves, ${Object.keys(abilitiesOut).length} abilities.`)
  console.log('Wild location slugs per region written to public/data/locations-report.json')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
