<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTeamStore } from '../stores/team'
import { loadPokemon, spriteUrl } from '../lib/api'
import { TYPES, defenseProfile, effectiveness } from '../lib/typeChart'
import { GAMES, GAME_ORDER } from '../data/games'
import { dexNo, fmtMult } from '../lib/utils'
import TypeBadge from '../components/TypeBadge.vue'
import PokemonPicker from '../components/PokemonPicker.vue'
import PageHeader from '../components/ui/PageHeader.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import Skeleton from '../components/ui/Skeleton.vue'
import SpriteImg from '../components/ui/SpriteImg.vue'
import Icon from '../components/ui/Icon.vue'

const { t } = useI18n()
const team = useTeamStore()
const details = ref({}) // id -> detail
// id -> true when its entry could not be loaded: that slot offers the picker again instead of a placeholder forever
const failed = ref({})

// every slot loads on its own, so one entry that fails does not hold back the others
watch(
  () => [...team.slots],
  (slots) => {
    for (const id of new Set(slots)) {
      if (!id || details.value[id]) continue
      loadPokemon(id).then(
        (d) => {
          details.value[id] = d
          delete failed.value[id]
        },
        () => (failed.value[id] = true),
      )
    }
  },
  { immediate: true },
)

const filled = computed(() => team.slots.filter(Boolean))
const members = computed(() => filled.value.map((id) => details.value[id]).filter(Boolean))

/** defensive coverage: per attacking type → lists of weak / resistant members */
const coverage = computed(() =>
  TYPES.map((ty) => {
    const weak = []
    const resist = []
    for (const m of members.value) {
      const mult = defenseProfile(m.types)[ty]
      if (mult > 1) weak.push({ m, mult })
      else if (mult < 1) resist.push({ m, mult })
    }
    return { type: ty, weak, resist }
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
    <PageHeader :title="t('team.title')" :accent="t('team.accent')">
      {{ t('team.subtitle') }}
      <template v-if="filled.length" #actions>
        <button
          type="button"
          class="h-10 rounded-lg border border-line-strong px-3 font-display text-base uppercase tracking-wider text-muted transition-colors duration-(--dur-1) hover:border-dexglow hover:text-ink active:translate-y-px"
          @click="team.clear()"
        >{{ t('team.clear') }}</button>
      </template>
    </PageHeader>

    <!-- slots -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <div
        v-for="(id, i) in team.slots" :key="i"
        class="animate-fadeup relative flex min-h-44 flex-col items-center justify-center rounded-2xl border p-3"
        :class="id && !failed[id] ? 'border-line bg-surface-1' : 'border-dashed border-line bg-surface-1/50'"
        :style="{ animationDelay: i * 40 + 'ms' }"
      >
        <template v-if="id && details[id]">
          <button
            type="button"
            :aria-label="t('team.remove', { name: details[id].label })"
            class="absolute right-1 top-1 grid size-9 place-items-center rounded-lg text-dim transition-colors duration-(--dur-1) hover:text-dexglow active:translate-y-px"
            @click="team.remove(i)"
          >
            <Icon name="close" />
          </button>
          <RouterLink :to="`/pokemon/${id}`" class="flex flex-col items-center">
            <SpriteImg :src="spriteUrl(id, 'gen3')" alt="" />
            <span class="num mt-1 text-xs text-dim">{{ dexNo(id) }}</span>
            <span class="text-sm font-semibold text-ink">{{ details[id].label }}</span>
          </RouterLink>
          <div class="mt-1.5 flex flex-wrap justify-center gap-1">
            <TypeBadge v-for="ty in details[id].types" :key="ty" :type="ty" size="sm" />
          </div>
        </template>

        <!-- a filled slot whose entry is still loading: its shape, not an empty picker -->
        <div v-else-if="id && !failed[id]" aria-busy="true" class="flex w-full flex-col items-center gap-2">
          <span class="sr-only">{{ t('common.loading') }}</span>
          <Skeleton :w="64" :h="64" :rounded="8" />
          <Skeleton w="35%" :h="12" />
          <Skeleton w="65%" :h="16" />
          <Skeleton w="50%" :h="18" />
        </div>

        <template v-else>
          <span class="eyebrow mb-2">{{ t('team.slot', { n: i + 1 }) }}</span>
          <div class="w-full">
            <PokemonPicker
              :exclude="filled"
              :placeholder="t('team.add')"
              :label="t('team.addLabel', { n: i + 1 })"
              @pick="team.setSlot(i, $event)"
            />
          </div>
        </template>
      </div>
    </div>

    <EmptyState v-if="!filled.length" class="mt-6" :title="t('team.empty')" :hint="t('team.emptyHint')" />

    <template v-else-if="members.length">
      <!-- warnings -->
      <section v-if="dangerTypes.length || notCovered.length" class="animate-fadeup mt-5 grid gap-4 lg:grid-cols-2">
        <div v-if="dangerTypes.length" class="rounded-2xl border border-bad/40 bg-bad/5 p-4">
          <h2 class="flex items-center gap-2 font-display text-base uppercase tracking-wider text-bad">
            <Icon name="warn" />{{ t('team.sharedWeak') }}
          </h2>
          <p class="mt-1.5 text-sm text-muted">{{ t('team.sharedWeakHint') }}</p>
          <div class="mt-2 flex flex-wrap gap-1.5">
            <span v-for="d in dangerTypes" :key="d.type" class="flex items-center gap-1.5">
              <TypeBadge :type="d.type" size="sm" /><span class="num text-xs text-dim">×{{ d.weak.length }}</span>
            </span>
          </div>
        </div>
        <div v-if="notCovered.length" class="rounded-2xl border border-line bg-surface-1 p-4">
          <h2 class="eyebrow">{{ t('team.noStab') }}</h2>
          <div class="mt-2 flex flex-wrap gap-1.5">
            <TypeBadge v-for="ty in notCovered" :key="ty" :type="ty" size="sm" />
          </div>
        </div>
      </section>

      <!-- defensive table -->
      <section class="animate-fadeup mt-5 rounded-2xl border border-line bg-surface-1 p-5" style="animation-delay: 60ms">
        <h2 class="eyebrow">{{ t('team.defense') }}</h2>
        <p class="mt-1 text-sm text-dim">{{ t('team.defenseHint') }}</p>
        <div class="scrollbar-thin mt-3 overflow-x-auto">
          <table class="w-full min-w-140 text-sm">
            <thead>
              <tr class="border-b border-line text-left text-xs font-semibold uppercase tracking-wider">
                <th scope="col" class="py-2 pr-3 font-semibold text-muted">{{ t('team.col.attack') }}</th>
                <th scope="col" class="py-2 pr-3 font-semibold text-bad">{{ t('team.col.weak') }}</th>
                <th scope="col" class="py-2 font-semibold text-good">{{ t('team.col.resist') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in coverage" :key="c.type" class="border-b border-line/40">
                <th scope="row" class="py-1.5 pr-3 text-left font-normal"><TypeBadge :type="c.type" size="sm" /></th>
                <td class="py-2 pr-3">
                  <span v-if="!c.weak.length" class="text-dim">—</span>
                  <span v-else class="inline-flex flex-wrap items-center gap-x-2.5">
                    <span v-for="w in c.weak" :key="w.m.id" class="inline-flex items-center">
                      <SpriteImg :src="spriteUrl(w.m.id, 'icons')" :alt="w.m.label" :title="w.m.label" :w="68" :h="56" centred class="-my-2" />
                      <span class="num text-base text-bad">×{{ fmtMult(w.mult) }}</span>
                    </span>
                  </span>
                </td>
                <td class="py-2">
                  <span v-if="!c.resist.length" class="text-dim">—</span>
                  <span v-else class="inline-flex flex-wrap items-center gap-x-2.5">
                    <span v-for="r in c.resist" :key="r.m.id" class="inline-flex items-center">
                      <SpriteImg :src="spriteUrl(r.m.id, 'icons')" :alt="r.m.label" :title="r.m.label" :w="68" :h="56" centred class="-my-2" />
                      <span class="num text-base text-good">×{{ fmtMult(r.mult) }}</span>
                    </span>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- availability -->
      <section class="animate-fadeup mt-5 rounded-2xl border border-line bg-surface-1 p-5" style="animation-delay: 100ms">
        <h2 class="eyebrow">{{ t('team.availability') }}</h2>
        <p class="mt-1 text-sm text-dim">{{ t('team.availabilityHint') }}</p>
        <div class="mt-3 space-y-2">
          <div v-for="a in availability" :key="a.version" class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span class="w-24 shrink-0 font-display text-base tracking-wider" :style="{ color: GAMES[a.version].color }">{{ GAMES[a.version].label }}</span>
            <ul class="flex flex-wrap gap-2">
              <li
                v-for="x in a.members" :key="x.m.id"
                class="rounded-lg border"
                :class="x.ok ? 'border-line bg-surface-2' : 'border-line/50 opacity-30 grayscale'"
              >
                <SpriteImg
                  :src="spriteUrl(x.m.id, 'icons')"
                  :alt="t(x.ok ? 'team.available' : 'team.unavailable', { name: x.m.label })"
                  :title="t(x.ok ? 'team.available' : 'team.unavailable', { name: x.m.label })"
                  :w="68"
                  :h="56"
                  centred
                />
              </li>
            </ul>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
