# KUBADEX — Gen 3 Pokédex

A field guide for **Pokémon FireRed · LeafGreen · Ruby · Sapphire · Emerald**: complete dex data, Gen 3-accurate mechanics and interactive encounter maps for Kanto (+ Sevii Islands) and Hoenn.

Built with **Vue 3 + Vite + Tailwind CSS v4 + Pinia**, served entirely from a prebuilt static dataset (works offline, no runtime API calls).

## Features

- **Pokédex grid** — all 386 Pokémon with search, type / game / regional-dex filters and stat sorting
- **Detail pages** — per-version Pokédex entries, animated base stats, abilities, type matchups, evolution trees (branches, stones, friendship, Feebas beauty, Shedinja), full movesets per version group, breeding & training data
- **Where to find** — interactive Town Map-style SVG of Kanto and Hoenn with glowing encounter markers per game version (levels, encounter rate, method), plus curated notes for starters, fossils, gifts, statics and event legendaries
- **Map Explorer** — click any location to list every wild Pokémon there, per version
- **Compare** — up to three Pokémon side by side with a stat radar and damage-taken table
- **Team Builder** — six slots, shared-weakness warnings, STAB coverage gaps, per-version availability; saved in localStorage
- **Gen 3 accuracy** — 17-type chart (no Fairy: Gardevoir is pure Psychic, Charm is Normal), physical/special determined by move *type*, Gen 3 game sprites

## Commands

```bash
npm install
npm run data   # one-time: builds public/data + public/sprites from PokeAPI (cached in scripts/.cache)
npm run dev    # dev server
npm run build  # production build to dist/
```

## Project layout

- `scripts/build-data.mjs` — dataset generator (PokeAPI → optimized JSON + sprites)
- `public/data/` — generated dataset (index, per-Pokémon files, moves, abilities, encounters-by-location)
- `src/data/maps/*.json` — hand-authored Town Map grids; `slug` matches PokeAPI location slugs
- `src/data/specialEncounters.js` — curated obtain-notes (starters, fossils, events…)
- `src/lib/typeChart.js` — Gen 3 type effectiveness

Data from [PokéAPI](https://pokeapi.co). Pokémon © Nintendo / Creatures Inc. / GAME FREAK — fan project, not affiliated.
