<script setup>
import { ref, computed } from 'vue'
import { catchChance, BALLS, STATUSES } from '../lib/catchRate'
import { spriteUrl } from '../lib/api'

const props = defineProps({
  catchRate: { type: Number, required: true },
  types: { type: Array, required: true },
})

const hp = ref(100) // percent of max HP
const oneHp = ref(false)
const status = ref('none')

const hpFrac = computed(() => (oneHp.value ? 0.02 : Math.max(1, hp.value) / 100))
const statusMult = computed(() => STATUSES.find((s) => s.id === status.value).mult)

const rows = computed(() =>
  BALLS.map((b) => {
    const p = catchChance(props.catchRate, hpFrac.value, b.mult(props.types), statusMult.value)
    return { ...b, p, throws: p > 0 ? Math.ceil(1 / p) : Infinity }
  }),
)

const pct = (p) => (p >= 0.999 ? '100%' : p < 0.001 ? '<0.1%' : (p * 100).toFixed(1) + '%')
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
      <!-- HP -->
      <div class="flex min-w-56 flex-1 items-center gap-3">
        <span class="font-display text-[10px] tracking-wider text-dim">HP</span>
        <input
          v-model.number="hp"
          type="range" min="1" max="100"
          class="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-panel2 accent-dex"
          :disabled="oneHp"
          :class="oneHp ? 'opacity-40' : ''"
        />
        <span class="w-12 text-right text-sm font-semibold tabular-nums" :class="oneHp ? 'text-dexglow' : 'text-ink'">
          {{ oneHp ? '1 HP' : hp + '%' }}
        </span>
        <button
          class="rounded-md border px-2 py-1 font-display text-[10px] tracking-wider transition-colors"
          :class="oneHp ? 'border-dex bg-dex/15 text-dexglow' : 'border-line text-dim hover:text-muted'"
          @click="oneHp = !oneHp"
        >FALSE SWIPE</button>
      </div>
      <!-- status -->
      <div class="flex gap-1">
        <button
          v-for="s in STATUSES" :key="s.id"
          class="rounded-md border px-2 py-1 font-display text-[10px] tracking-wider transition-colors"
          :class="status === s.id ? 'border-lens bg-lens/10 text-lens' : 'border-line text-dim hover:text-muted'"
          @click="status = s.id"
        >{{ s.label }}</button>
      </div>
    </div>

    <div class="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      <div
        v-for="b in rows" :key="b.id"
        class="flex min-h-24 items-center justify-center gap-2.5 overflow-hidden rounded-xl border border-line bg-bg/40 p-2.5"
      >
        <img :src="spriteUrl(b.sprite, 'balls')" :alt="b.label" class="pixelated size-18 shrink-0" />
        <!-- name → condition → chance → 5-throw odds, vertically centered as one block -->
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold text-ink">{{ b.label }}</p>
          <p class="truncate text-[11px] text-lens/80">{{ b.note || 'Always available' }}</p>
          <p class="mt-1 text-xl font-bold leading-none tabular-nums" :style="{ color: b.p >= 0.5 ? '#7ac74c' : b.p >= 0.15 ? '#e8cf45' : '#e0564b' }">
            {{ pct(b.p) }}
          </p>
          <p class="mt-0.5 truncate text-[11px] text-dim tabular-nums">
            <template v-if="b.p > 0">{{ pct(1 - Math.pow(1 - b.p, 5)) }} in 5 throws</template>
            <template v-else>can't be caught</template>
          </p>
        </div>
      </div>
    </div>
    <p class="mt-2 text-[11px] text-dim">
      Per-throw odds, exact Gen 3 formula (catch rate {{ catchRate }}). Conditional balls show their best case.
    </p>
  </div>
</template>
