import { it, expect } from 'vitest'
import { parseQuery, serializeQuery } from '../../src/lib/queryState.js'

const S = { q: { kind: 'text', max: 40 }, type: { kind: 'list', values: ['fire','water','flying'], max: 2, default: [] },
  game: { kind: 'enum', values: ['ruby','firered'], default: null }, sort: { kind: 'enum', values: ['id','name'], default: 'id' },
  tm: { kind: 'bool' } }
it('drops garbage from a hand-edited URL', () =>
  expect(parseQuery({ type: 'fire,fire,banana,water,flying', sort: 'evil', game: 'zelda', q: 'x'.repeat(99) }, S))
    .toEqual({ q: 'x'.repeat(40), type: ['fire', 'water'], game: null, sort: 'id', tm: false }))
it('omits defaults when serializing', () =>
  expect(serializeQuery({ q: '', type: [], game: null, sort: 'id', tm: false }, S)).toEqual({}))
it('round-trips', () => {
  const st = { q: 'char', type: ['fire', 'flying'], game: 'firered', sort: 'name', tm: true }
  expect(parseQuery(serializeQuery(st, S), S)).toEqual(st)
})
it('takes the first value of a repeated param', () => expect(parseQuery({ sort: ['name', 'id'] }, S).sort).toBe('name'))
