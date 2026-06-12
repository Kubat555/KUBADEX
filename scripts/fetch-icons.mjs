// Downloads Poké Ball item sprites (PokeAPI) and Gen 3 trainer portraits
// (Pokémon Showdown) into public/sprites/{balls,trainers}/.
import { mkdir, writeFile, access } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BALLS_DIR = path.join(ROOT, 'public', 'sprites', 'balls')
const TRAINERS_DIR = path.join(ROOT, 'public', 'sprites', 'trainers')

const BALLS = ['poke-ball', 'great-ball', 'ultra-ball', 'net-ball', 'repeat-ball', 'timer-ball', 'dive-ball', 'nest-ball', 'safari-ball']

const TRAINERS = [
  'brock', 'misty', 'ltsurge', 'erika', 'koga', 'sabrina', 'blaine', 'giovanni',
  'lorelei', 'bruno', 'agatha', 'lance', 'blue',
  'roxanne', 'brawly', 'wattson', 'flannery', 'norman', 'winona', 'tateandliza', 'wallace', 'juan',
  'sidney', 'phoebe', 'glacia', 'drake', 'steven',
]

const exists = (p) => access(p).then(() => true, () => false)

async function download(url, file) {
  const res = await fetch(url)
  if (!res.ok) return false
  await writeFile(file, Buffer.from(await res.arrayBuffer()))
  return true
}

await mkdir(BALLS_DIR, { recursive: true })
await mkdir(TRAINERS_DIR, { recursive: true })

for (const ball of BALLS) {
  const file = path.join(BALLS_DIR, `${ball}.png`)
  if (await exists(file)) continue
  const ok = await download(`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${ball}.png`, file)
  console.log(ok ? '✓' : '✗', ball)
}

for (const t of TRAINERS) {
  const file = path.join(TRAINERS_DIR, `${t}.png`)
  if (await exists(file)) continue
  // prefer the era-correct gen3 art, fall back to the default sprite
  const ok =
    (await download(`https://play.pokemonshowdown.com/sprites/trainers/${t}-gen3.png`, file)) ||
    (await download(`https://play.pokemonshowdown.com/sprites/trainers/${t}.png`, file))
  console.log(ok ? '✓' : '✗ MISSING', t)
}

console.log('Done.')
