import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('loadPokemon', () => {
  beforeEach(() => vi.resetModules())
  afterEach(() => vi.unstubAllGlobals())

  it('evicts a failed request so the next call retries', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce({ ok: true, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({ id: 25 }) })
    vi.stubGlobal('fetch', fetchMock)
    const { loadPokemon } = await import('../../src/lib/api.js')
    await expect(loadPokemon(25)).rejects.toThrow()
    await expect(loadPokemon(25)).resolves.toEqual({ id: 25 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('rejects an HTML fallback page instead of returning it as data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, headers: new Headers({ 'content-type': 'text/html' }), json: async () => { throw new SyntaxError('x') } }))
    const { loadPokemon } = await import('../../src/lib/api.js')
    await expect(loadPokemon(9999)).rejects.toThrow(/pokemon\/9999/)
  })

  it('rejects a non-ok response with an error naming the path, and evicts it', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 404, headers: new Headers(), json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({ id: 1 }) })
    vi.stubGlobal('fetch', fetchMock)
    const { loadPokemon } = await import('../../src/lib/api.js')
    await expect(loadPokemon(1)).rejects.toThrow(/pokemon\/1\.json/)
    await expect(loadPokemon(1)).resolves.toEqual({ id: 1 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('shares one request between concurrent and repeated successful calls', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({ id: 25 }) })
    vi.stubGlobal('fetch', fetchMock)
    const { loadPokemon } = await import('../../src/lib/api.js')
    await Promise.all([loadPokemon(25), loadPokemon(25)])
    await loadPokemon(25)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
