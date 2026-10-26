// Filter state of a list screen <-> its URL query. A schema describes every field, and everything read from the URL
// goes through it, so a hand-edited or stale link can never put an unknown value into the state.
//
//   { kind: 'text', max }                       free text, trimmed and cut to `max` characters; default ''
//   { kind: 'enum', values, default }           one of `values`, anything else becomes `default`
//   { kind: 'list', values, max, default: [] }  comma-separated subset of `values`, no repeats, at most `max`
//   { kind: 'bool' }                            '1' in the URL means true; default false
//
// Default values are never written to the URL, so a screen without filters keeps a clean address.

// vue-router gives a repeated param (`?a=1&a=2`) as an array and a bare one (`?a`) as null.
function text(raw) {
  const v = Array.isArray(raw) ? raw[0] : raw
  return typeof v === 'string' ? v : ''
}

const PARSE = {
  text: (raw, f) => text(raw).trim().slice(0, f.max),
  enum: (raw, f) => (f.values.includes(text(raw)) ? text(raw) : f.default),
  list: (raw, f) => {
    if (raw == null) return [...f.default]
    return [...new Set(text(raw).split(',').filter((v) => f.values.includes(v)))].slice(0, f.max)
  },
  bool: (raw) => text(raw) === '1',
}

const SERIALIZE = {
  text: (v) => v || undefined,
  enum: (v, f) => (v == null || v === f.default ? undefined : v),
  list: (v, f) => (v.join(',') === f.default.join(',') ? undefined : v.join(',')),
  bool: (v) => (v ? '1' : undefined),
}

export function parseQuery(query, schema) {
  const state = {}
  for (const [key, field] of Object.entries(schema)) state[key] = PARSE[field.kind](query[key], field)
  return state
}

export function serializeQuery(state, schema) {
  const query = {}
  for (const [key, field] of Object.entries(schema)) {
    const v = SERIALIZE[field.kind](state[key], field)
    if (v !== undefined) query[key] = v
  }
  return query
}
