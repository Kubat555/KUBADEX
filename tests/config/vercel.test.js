import { it, expect } from 'vitest'
import cfg from '../../vercel.json'

it('rewrites every route to the SPA shell', () => {
  expect(cfg.rewrites).toContainEqual({ source: '/(.*)', destination: '/index.html' })
})

it('caches hashed assets immutably', () => {
  const h = cfg.headers.find((x) => x.source === '/assets/(.*)')
  expect(h.headers).toContainEqual({ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' })
})

it('caches sprites and cries for a week with background revalidation', () => {
  const h = cfg.headers.find((x) => x.source === '/(sprites|cries)/(.*)')
  expect(h.headers).toContainEqual({ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' })
})

it('caches data files for an hour with background revalidation', () => {
  const h = cfg.headers.find((x) => x.source === '/data/(.*)')
  expect(h.headers).toContainEqual({ key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' })
})
