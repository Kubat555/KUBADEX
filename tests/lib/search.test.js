import { describe, it, expect } from 'vitest'
import index from '../../public/data/index.json'
import {
  normalize,
  parseDexNumber,
  distance,
  searchPokemon,
  speciesLabel,
  isGuessCorrect,
} from '../../src/lib/search.js'

const ids = (q, opts) => searchPokemon(index, q, opts).map((p) => p.id)
const byId = (id) => index.find((p) => p.id === id)

describe('normalize', () => {
  it('lowercases and drops punctuation and spaces', () => {
    expect(normalize("Farfetch'd")).toBe('farfetchd')
    expect(normalize('Mr. Mime')).toBe('mrmime')
    expect(normalize('Ho-Oh')).toBe('hooh')
  })

  it('strips latin diacritics', () => {
    expect(normalize('Pokémon')).toBe('pokemon')
    expect(normalize('Flabébé')).toBe('flabebe')
  })

  it('maps the gender signs to f and m', () => {
    expect(normalize('Nidoran♀')).toBe('nidoranf')
    expect(normalize('Nidoran♂')).toBe('nidoranm')
  })

  it('folds ё to е but keeps й', () => {
    expect(normalize('Тёмный')).toBe('темный')
    expect(normalize('Электро Йод')).toBe('электройод')
  })

  it('keeps digits', () => {
    expect(normalize('Porygon 2')).toBe('porygon2')
  })

  it('is safe on empty and non-string input', () => {
    expect(normalize('')).toBe('')
    expect(normalize(null)).toBe('')
    expect(normalize(undefined)).toBe('')
  })
})

describe('parseDexNumber', () => {
  it.each([
    ['#025', 25],
    ['025', 25],
    ['25', 25],
    ['no.25', 25],
    ['No. 25', 25],
    ['№25', 25],
    ['  #386 ', 386],
  ])('"%s" → %i', (q, n) => expect(parseDexNumber(q)).toBe(n))

  it.each(['', 'pikachu', '25a', 'a25', '2 5', '#', 'no', '12345', '-5', '2.5'])(
    '"%s" → null',
    (q) => expect(parseDexNumber(q)).toBeNull(),
  )
})

describe('distance', () => {
  it('is 0 for equal strings', () => expect(distance('pikachu', 'pikachu', 2)).toBe(0))
  it('counts a substitution as 1', () => expect(distance('pikachi', 'pikachu', 2)).toBe(1))
  it('counts an insertion and a deletion as 1', () => {
    expect(distance('pikchu', 'pikachu', 2)).toBe(1)
    expect(distance('pikaachu', 'pikachu', 2)).toBe(1)
  })
  it('counts an adjacent transposition as 1', () => expect(distance('pikahcu', 'pikachu', 2)).toBe(1))
  it('returns exact values up to max', () => expect(distance('kitten', 'sitting', 3)).toBe(3))
  it('returns max + 1 when the distance exceeds max', () => {
    expect(distance('kitten', 'sitting', 2)).toBe(3)
    expect(distance('pikachu', 'charizard', 2)).toBe(3)
  })
  it('exits early when the length gap alone exceeds max', () => {
    expect(distance('a', 'abcdefgh', 1)).toBe(2)
  })
  it('handles empty strings', () => {
    expect(distance('', '', 2)).toBe(0)
    expect(distance('', 'ab', 2)).toBe(2)
    expect(distance('ab', '', 1)).toBe(2)
  })
})

describe('searchPokemon', () => {
  it.each([
    ['Mr. Mime', 122],
    ['mr mime', 122],
    ['mrmime', 122],
    ["farfetch'd", 83],
    ['farfetchd', 83],
    ['ho oh', 250],
    ['nidoran♀', 29],
    ['nidoran f', 29],
    ['#025', 25],
    ['025', 25],
    ['25', 25],
    ['pikachi', 25],
    ['charzard', 6],
    ['porygon 2', 233],
    ['deoxys', 386],
  ])('"%s" → first result #%i', (q, id) => expect(ids(q)[0]).toBe(id))

  it('empty query returns nothing', () => expect(searchPokemon(index, '  ')).toEqual([]))
  it('punctuation-only query returns nothing', () => expect(searchPokemon(index, "' .-")).toEqual([]))
  it('respects limit', () => expect(searchPokemon(index, 'a', { limit: 5 })).toHaveLength(5))
  it('defaults the limit to 8', () => expect(searchPokemon(index, 'a')).toHaveLength(8))
  it('returns the index entries themselves', () => expect(searchPokemon(index, 'pikachu')[0]).toBe(byId(25)))

  it('puts the exact dex number before any name match', () => {
    // "2" is also a substring of "Porygon2" (#233); the number must win
    const r = ids('2')
    expect(r[0]).toBe(2)
    expect(r).toContain(233)
  })

  it('ranks exact name > prefix > word prefix > substring > typo', () => {
    const mini = [
      { id: 1, name: 'zzzmimeyy', label: 'Zzzmimeyy' }, // substring
      { id: 2, name: 'mimi', label: 'Mimi' }, // typo of "mime" (distance 1)
      { id: 3, name: 'mime-jr', label: 'Mime Jr' }, // prefix
      { id: 4, name: 'mime', label: 'Mime' }, // exact name
      { id: 5, name: 'mr-mime', label: 'Mr. Mime' }, // word prefix
    ]
    expect(searchPokemon(mini, 'mime').map((p) => p.id)).toEqual([4, 3, 5, 1, 2])
  })

  it('breaks rank ties by id', () => {
    const mini = [
      { id: 30, name: 'abc-c', label: 'Abc C' },
      { id: 10, name: 'abc-a', label: 'Abc A' },
      { id: 20, name: 'abc-b', label: 'Abc B' },
    ]
    expect(searchPokemon(mini, 'abc').map((p) => p.id)).toEqual([10, 20, 30])
  })

  it('treats the species label as an exact name', () => {
    const mini = [
      { id: 2, name: 'foobar', label: 'Foobar' },
      { id: 5, name: 'foo-normal', label: 'Foo Normal' },
    ]
    // "foo" is exactly the species label of #5 and only a prefix of #2
    expect(searchPokemon(mini, 'foo').map((p) => p.id)).toEqual([5, 2])
  })

  it('lists both Nidorans for the shared prefix, lower id first', () => {
    expect(ids('nidoran').slice(0, 2)).toEqual([29, 32])
  })

  it('tells the two Nidorans apart', () => {
    expect(ids('nidoran♂')[0]).toBe(32)
    expect(ids('nidoran m')[0]).toBe(32)
  })

  it('finds a pokemon by a later word of its name', () => {
    expect(ids('mime')[0]).toBe(122)
  })

  it('finds a pokemon by a substring', () => {
    expect(ids('aur')).toContain(3) // Venusaur
  })

  it('does not apply typo matching to queries shorter than 4 characters', () => {
    expect(ids('pkc')).toEqual([])
    expect(ids('xyz')).toEqual([])
  })

  it('allows 1 typo for queries of 4-6 characters but not 2', () => {
    expect(ids('pikchu')[0]).toBe(25) // 6 chars, distance 1
    expect(ids('raihcu')[0]).toBe(26) // Raichu, 6 chars, one transposition = distance 1
    expect(ids('pkchu')).not.toContain(25) // 5 chars, distance 2
  })

  it('allows 2 typos for queries of 7+ characters', () => {
    expect(ids('pikchuu')[0]).toBe(25) // 7 chars, distance 2
  })

  it('does not match a name that is further away than the typo limit', () => {
    expect(ids('zzzzzzzz')).toEqual([])
  })

  it('ranks the closer typo first among typo matches', () => {
    const mini = [
      { id: 1, name: 'alakazam', label: 'Alakazam' }, // distance 2 from "alkazaam"
      { id: 2, name: 'alkazam', label: 'Alkazam' }, // distance 1 from "alkazaam"
    ]
    expect(searchPokemon(mini, 'alkazaam').map((p) => p.id)).toEqual([2, 1])
  })

  it('searches the whole index of 386 entries', () => {
    expect(index).toHaveLength(386)
    expect(ids('o', { limit: 1000 }).length).toBeGreaterThan(100)
  })
})

describe('speciesLabel', () => {
  it('drops the default form suffix', () => {
    expect(speciesLabel({ label: 'Deoxys Normal' })).toBe('Deoxys')
  })
  it('leaves other labels alone', () => {
    expect(speciesLabel({ label: 'Pikachu' })).toBe('Pikachu')
    expect(speciesLabel({ label: 'Mr. Mime' })).toBe('Mr. Mime')
    expect(speciesLabel({ label: 'Deoxys Attack' })).toBe('Deoxys Attack')
  })
})

describe('isGuessCorrect', () => {
  it('accepts Deoxys as the WTP answer', () => expect(isGuessCorrect('Deoxys', byId(386))).toBe(true))
  it('accepts the full label and the raw name too', () => {
    expect(isGuessCorrect('Deoxys Normal', byId(386))).toBe(true)
    expect(isGuessCorrect('deoxys-normal', byId(386))).toBe(true)
  })
  it('is forgiving about case, spaces and punctuation', () => {
    expect(isGuessCorrect('mr mime', byId(122))).toBe(true)
    expect(isGuessCorrect("FARFETCH'D", byId(83))).toBe(true)
    expect(isGuessCorrect('ho oh', byId(250))).toBe(true)
  })
  it('rejects a different pokemon', () => expect(isGuessCorrect('Pichu', byId(25))).toBe(false))
  it('rejects a typo (a guess is not a search)', () => expect(isGuessCorrect('Pikachi', byId(25))).toBe(false))
  it('rejects an empty guess', () => {
    expect(isGuessCorrect('', byId(25))).toBe(false)
    expect(isGuessCorrect(' .- ', byId(25))).toBe(false)
  })
})
