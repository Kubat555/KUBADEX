<script setup>
import { ref, computed, watch } from 'vue'
import { useTeamStore } from '../stores/team'
import { loadPokemon, loadIndex, spriteUrl } from '../lib/api'
import { TYPES, defenseProfile, effectiveness } from '../lib/typeChart'
import { GAMES, GAME_ORDER } from '../data/games'
import { dexNo, fmtMult } from '../lib/utils'
import TypeBadge from '../components/TypeBadge.vue'
import PokemonPicker from '../components/PokemonPicker.vue'

const team = useTeamStore()
const details = ref({}) // id -> detail
const indexById = ref({})

watch(
  () => [...team.slots],
  async (slots) => {
    const idx = await loadIndex()
    indexById.value = Object.fromEntries(idx.map((p) => [p.id, p]))
    const need = slots.filter((id) => id && !details.value[id])
    const loaded = await Promise.all(need.map(loadPokemon))
    for (const d of loaded) details.value[d.id] = d
  },
  { immediate: true },
)

const members = computed(() => team.slots.filter(Boolean).map((id) => details.value[id]).filter(Boolean))

/** defensive coverage: per attacking type → lists of weak / resistant members */
const coverage = computed(() =>
  TYPES.map((t) => {
    const weak = []
    const resist = []
    for (const m of members.value) {
      const mult = defenseProfile(m.types)[t]
      if (mult > 1) weak.push({ m, mult })
      else if (mult < 1) resist.push({ m, mult })
    }
    return { type: t, weak, resist }
  }),
)

const dangerTypes = computed(() => coverage.value.filter((c) => c.weak.length >= 2 && c.weak.length > c.resist.length))

/** offensive STAB coverage: which defender types at least one member hits super-effectively */
const stabTypes = computed(() => [...new Set(members.value.flatMap((m) => m.types))])
const offense = computed(() =>
  TYPES.map((def) => ({
    type: def,
    hit: Math.max(0, ...stabTypes.value.map((atk) => effectiveness(atk, def))),
  })),
)
const notCovered = computed(() => offense.value.filter((o) => o.hit < 2).map((o) => o.type))

/** per-version availability of the whole team */
const availability = computed(() =>
  GAME_ORDER.map((v) => ({
    version: v,
    members: members.value.map((m) => ({ m, ok: m.games.includes(v) })),
  })),
)
</script>

<template>
  <div>
    <section class="animate-fadeup mb-5 flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-line bg-panel/60 p-5">
      <div>
        <h1 class="font-display text-2xl text-ink">TEAM <span class="text-dexglow">BUILDER</span></h1>
        <p class="mt-1 text-sm text-muted">Build a party of six, then check its type coverage before the Elite Four.</p>
      </div>
      <button
        v-if="members.length"
        class="rounded-lg border border-line px-3 py-1.5 font-display text-xs tracking-wider text-dim transition-colors hover:border-dex hover:text-dexglow"
        @click="team.clear()"
      >CLEAR ALL</button>
    </section>

    <!-- slots -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <div
        v-for="(id, i) in team.slots" :key="i"
        class="animate-fadeup relative flex min-h-44 flex-col items-center justify-center rounded-2xl border p-3"
        :class="id ? 'border-line bg-panel/70' : 'border-dashed border-line bg-panel/30'"
        :style="{ animationDelay: i * 40 + 'ms' }"
      >
        <template v-if="id && details[id]">
          <button class="absolute right-2 top-1.5 text-dim transition-colors hover:text-dexglow" title="Remove" @click="team.remove(i)">✕</button>
          <RouterLink :to="`/pokemon/${id}`" class="flex flex-col items-center">
            <img :src="spriteUrl(id, 'gen3')" :alt="details[id].label" class="pixelated size-16 object-contain" />
            <span class="mt-1 font-display text-[10px] text-dim">{{ dexNo(id) }}</span>
            <span class="text-sm font-semibold text-ink">{{ details[id].label }}</span>
          </RouterLink>
          <div class="mt-1.5 flex gap-1">
            <TypeBadge v-for="t in details[id].types" :key="t" :type="t" size="sm" />
          </div>
        </template>
        <template v-else>
          <span class="mb-2 font-display text-[10px] tracking-widest text-dim">SLOT {{ i + 1 }}</span>
          <div class="w-full"><PokemonPicker :exclude="team.slots.filter(Boolean)" placeholder="Add…" @pick="team.setSlot(i, $event)" /></div>
        </template>
      </div>
    </div>

    <div v-if="!members.length" class="mt-6 rounded-2xl border border-dashed border-line py-16 text-center text-sm text-dim">
      Your team is empty — add Pokémon to see its coverage analysis.
    </div>

    <template v-else>
      <!-- warnings -->
      <section v-if="dangerTypes.length || notCovered.length" class="animate-fadeup mt-5 grid gap-4 lg:grid-cols-2">
        <div v-if="dangerTypes.length" class="rounded-2xl border border-[#e0564b]/40 bg-[#e0564b]/5 p-4">
          <p class="font-display text-xs tracking-widest text-[#e0564b]">⚠ SHARED WEAKNESSES</p>
          <p class="mt-1.5 text-sm text-muted">Multiple members fall to:</p>
          <div class="mt-2 flex flex-wrap gap-1.5">
            <span v-for="d in dangerTypes" :key="d.type" class="flex items-center gap-1.5">
              <TypeBadge :type="d.type" size="sm" /><span class="text-xs text-dim">×{{ d.weak.length }}</span>
            </span>
          </div>
        </div>
        <div v-if="notCovered.length" class="rounded-2xl border border-line bg-panel/60 p-4">
          <p class="font-display text-xs tracking-widest text-muted">NO SUPER-EFFECTIVE STAB VS</p>
          <div class="mt-2 flex flex-wrap gap-1.5">
            <TypeBadge v-for="t in notCovered" :key="t" :type="t" size="sm" />
          </div>
        </div>
      </section>

      <!-- defensive table -->
      <section class="animate-fadeup mt-5 rounded-2xl border border-line bg-panel/70 p-5" style="animation-delay: 60ms">
        <h2 class="font-display text-sm tracking-widest text-dexglow">DEFENSIVE COVERAGE</h2>
        <p class="mt-1 text-xs text-dim">For each attacking type — who on your team takes extra damage, and who walls it.</p>
        <div class="scrollbar-thin mt-3 overflow-x-auto">
          <table class="w-full min-w-140 text-sm">
            <thead>
              <tr class="border-b border-line text-left font-display text-[11px] tracking-wider text-dim">
                <th class="py-2 pr-3 font-normal">ATTACK</th>
                <th class="py-2 pr-3 font-normal text-[#e0564b]">WEAK</th>
                <th class="py-2 font-normal text-[#7ac74c]">RESIST / IMMUNE</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in coverage" :key="c.type" class="border-b border-line/40">
                <td class="py-1.5 pr-3"><TypeBadge :type="c.type" size="sm" /></td>
                <td class="py-1.5 pr-3">
                  <span v-if="!c.weak.length" class="text-dim">—</span>
                  <span v-else class="inline-flex flex-wrap items-center gap-2">
                    <span v-for="w in c.weak" :key="w.m.id" class="inline-flex items-center gap-1">
                      <img :src="spriteUrl(w.m.id, 'icons')" class="pixelated size-6" :title="w.m.label" alt="" />
                      <span class="font-display text-[10px] text-[#e0564b]">×{{ fmtMult(w.mult) }}</span>
                    </span>
                  </span>
                </td>
                <td class="py-1.5">
                  <span v-if="!c.resist.length" class="text-dim">—</span>
                  <span v-else class="inline-flex flex-wrap items-center gap-2">
                    <span v-for="r in c.resist" :key="r.m.id" class="inline-flex items-center gap-1">
                      <img :src="spriteUrl(r.m.id, 'icons')" class="pixelated size-6" :title="r.m.label" alt="" />
                      <span class="font-display text-[10px] text-[#7ac74c]">×{{ fmtMult(r.mult) }}</span>
                    </span>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- availability -->
      <section class="animate-fadeup mt-5 rounded-2xl border border-line bg-panel/70 p-5" style="animation-delay: 100ms">
        <h2 class="font-display text-sm tracking-widest text-dexglow">TEAM AVAILABILITY BY VERSION</h2>
        <p class="mt-1 text-xs text-dim">Whether each member appears in that game's dex or wild areas (trades not counted).</p>
        <div class="mt-3 space-y-2">
          <div v-for="a in availability" :key="a.version" class="flex items-center gap-3">
            <span class="w-24 shrink-0 font-display text-xs tracking-wider" :style="{ color: GAMES[a.version].color }">{{ GAMES[a.version].label }}</span>
            <div class="flex gap-2">
              <span
                v-for="x in a.members" :key="x.m.id"
                class="grid size-9 place-items-center rounded-lg border"
                :class="x.ok ? 'border-line bg-panel2' : 'border-line/50 opacity-30 grayscale'"
                :title="`${x.m.label} — ${x.ok ? 'available' : 'not obtainable here (trade required)'}`"
              >
                <img :src="spriteUrl(x.m.id, 'icons')" class="pixelated size-7" alt="" />
              </span>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
