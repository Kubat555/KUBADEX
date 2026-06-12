// Takes README screenshots from the running dev server (npm run dev) into .github/assets/.
import { mkdir } from 'node:fs/promises'
import puppeteer from 'puppeteer'

const BASE = 'http://localhost:5173'
const OUT = '.github/assets'

const FREEZE_CSS = `
  * { animation-duration: 0s !important; animation-delay: 0s !important; transition-duration: 0s !important; }
  ::-webkit-scrollbar { display: none; }
`

await mkdir(OUT, { recursive: true })
const browser = await puppeteer.launch()
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 2 })

async function open(path, { version, team } = {}) {
  await page.goto(BASE + path, { waitUntil: 'networkidle0' })
  if (version || team) {
    await page.evaluate((v, t) => {
      if (v) localStorage.setItem('dex3-version', v)
      if (t) localStorage.setItem('dex3-team', JSON.stringify(t))
    }, version ?? null, team ?? null)
    await page.goto(BASE + path, { waitUntil: 'networkidle0' })
  }
  await page.addStyleTag({ content: FREEZE_CSS })
  await new Promise((r) => setTimeout(r, 600))
}

async function shotSection(headingText, file, pad = 16) {
  const handle = await page.evaluateHandle((txt) => {
    const h = [...document.querySelectorAll('h2')].find((e) => e.textContent.includes(txt))
    return h?.closest('section')
  }, headingText)
  const el = handle.asElement()
  await el.scrollIntoView()
  await new Promise((r) => setTimeout(r, 300))
  const box = await el.boundingBox() // viewport-relative — add scroll for document coords
  const scrollY = await page.evaluate(() => window.scrollY)
  await page.screenshot({
    path: `${OUT}/${file}`,
    clip: {
      x: Math.max(0, box.x - pad),
      y: Math.max(0, box.y + scrollY - pad),
      width: Math.min(1440, box.width + pad * 2),
      height: box.height + pad * 2,
    },
  })
  console.log('✓', file)
}

// 1. Home — hero, filters and the start of the grid
await open('/')
await page.screenshot({ path: `${OUT}/home.png` })
console.log('✓ home.png')

// 2. Pokémon hero (Sceptile, Emerald)
await open('/pokemon/254', { version: 'emerald' })
const hero = await page.$('main section')
const heroBox = await hero.boundingBox()
await page.screenshot({
  path: `${OUT}/pokemon.png`,
  clip: { x: heroBox.x - 16, y: Math.max(0, heroBox.y - 16), width: heroBox.width + 32, height: heroBox.height + 32 },
})
console.log('✓ pokemon.png')

// 3. Encounters map (Pikachu in FireRed — Kanto map with highlights)
await open('/pokemon/25', { version: 'firered' })
await shotSection('WHERE TO FIND', 'encounters.png')

// 4. Map explorer — Hoenn, Route 119 selected
await open('/map')
await page.evaluate(() => {
  const t = [...document.querySelectorAll('svg text')].find((x) => x.textContent.trim() === '119')
  t?.closest('g')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
})
await new Promise((r) => setTimeout(r, 400))
const mapGrid = await page.$('main div.grid')
const mapBox = await mapGrid.boundingBox()
await page.screenshot({
  path: `${OUT}/map.png`,
  clip: { x: mapBox.x - 16, y: mapBox.y - 16, width: mapBox.width + 32, height: Math.min(mapBox.height + 32, 1100) },
})
console.log('✓ map.png')

// scroll so the first card grid sits right under the sticky header
const scrollToGrid = () =>
  page.evaluate(() => {
    const grid = document.querySelector('main div.grid')
    window.scrollTo(0, grid.getBoundingClientRect().top + window.scrollY - 72)
  })

// 5. Compare — the classic starter trio
await open('/compare?p=6,9,3')
await scrollToGrid()
await new Promise((r) => setTimeout(r, 300))
await page.screenshot({ path: `${OUT}/compare.png` })
console.log('✓ compare.png')

// 6. Team builder — full team + coverage warnings
await open('/team', { team: [254, 257, 260, 6, 282, 130] })
await scrollToGrid()
await new Promise((r) => setTimeout(r, 300))
await page.screenshot({ path: `${OUT}/team.png` })
console.log('✓ team.png')

// 7. Bosses guide — Emerald gyms
await open('/bosses', { version: 'emerald' })
await scrollToGrid()
await new Promise((r) => setTimeout(r, 300))
await page.screenshot({ path: `${OUT}/bosses.png` })
console.log('✓ bosses.png')

// 8. EV hotspots — Emerald, Speed
await open('/ev-training', { version: 'emerald' })
await page.screenshot({ path: `${OUT}/ev.png` })
console.log('✓ ev.png')

// 9. Movedex — Thunderbolt learners
await open('/moves', { version: 'emerald' })
await page.evaluate(() => {
  ;[...document.querySelectorAll('tbody tr')].find((r) => r.textContent.includes('Thunderbolt'))?.click()
})
await new Promise((r) => setTimeout(r, 400))
await page.evaluate(() => window.scrollTo(0, 330))
await new Promise((r) => setTimeout(r, 200))
await page.screenshot({ path: `${OUT}/movedex.png` })
console.log('✓ movedex.png')

await browser.close()
console.log('Done.')
