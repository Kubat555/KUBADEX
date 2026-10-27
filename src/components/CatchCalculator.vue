<script setup>
import { ref, computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { catchChance, BALLS, STATUSES } from '../lib/catchRate'
import { spriteUrl } from '../lib/api'
import Segmented from './ui/Segmented.vue'
import SpriteImg from './ui/SpriteImg.vue'

const props = defineProps({
  catchRate: { type: Number, required: true },
  types: { type: Array, required: true },
})

const { t, locale } = useI18n()
const hpId = useId()

const hp = ref(100) // percent of max HP
const oneHp = ref(false)
const status = ref('none')

const hpFrac = computed(() => (oneHp.value ? 0.02 : Math.max(1, hp.value) / 100))
const statusMult = computed(() => STATUSES.find((s) => s.id === status.value).mult)
const statusOptions = computed(() => STATUSES.map((s) => ({ value: s.id, label: t(`catch.status.${s.id}`) })))

const rows = computed(() =>
  BALLS.map((b) => ({ ...b, p: catchChance(props.catchRate, hpFrac.value, b.mult(props.types), statusMult.value) })),
)

const percent = computed(() => ({
  whole: new Intl.NumberFormat(locale.value, { style: 'percent', maximumFractionDigits: 0 }),
  tenth: new Intl.NumberFormat(locale.value, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }),
}))
const pct = (p) => (p >= 0.999 ? percent.value.whole.format(1) : p < 0.001 ? `<${percent.value.tenth.format(0.001)}` : percent.value.tenth.format(p))
const hpText = computed(() => percent.value.whole.format(hp.value / 100))
const chanceColor = (p) => (p >= 0.5 ? 'var(--color-good)' : p >= 0.15 ? 'var(--color-warn)' : 'var(--color-bad)')
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
      <!-- HP -->
      <div class="flex min-w-64 flex-1 items-center gap-3">
        <label :for="hpId" class="eyebrow">{{ t('catch.hp') }}</label>
        <input
          :id="hpId"
          v-model.number="hp"
          type="range" min="1" max="100"
          class="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-panel2 accent-dex"
          :aria-valuetext="hpText"
          :disabled="oneHp"
          :class="oneHp ? 'opacity-40' : ''"
        />
        <span class="num w-14 shrink-0 text-right text-sm" :class="oneHp ? 'text-dexglow' : 'text-ink'">
          {{ oneHp ? t('catch.oneHp') : hpText }}
        </span>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          :aria-pressed="oneHp"
          class="h-8 rounded-lg border px-3 text-xs font-semibold uppercase tracking-wider transition-colors duration-(--dur-1) active:translate-y-px"
          :class="oneHp ? 'border-dex bg-dex/15 text-dexglow' : 'border-line-strong text-muted hover:text-ink'"
          @click="oneHp = !oneHp"
        >{{ t('catch.falseSwipe') }}</button>
        <Segmented v-model="status" :options="statusOptions" :label="t('catch.statusLabel')" size="sm" />
      </div>
    </div>

    <!-- fixed-width cards, wrapped and centred: a short last row sits in the middle instead of hanging on the left -->
    <ul class="mt-4 flex flex-wrap justify-center gap-2.5">
      <li
        v-for="b in rows" :key="b.id"
        class="flex w-36 flex-col items-center gap-1 rounded-xl border border-line bg-bg/40 px-2 py-3 text-center"
      >
        <SpriteImg :src="spriteUrl(b.sprite, 'balls')" alt="" :w="30" :scale="2" />
        <p class="text-sm font-semibold text-ink">{{ b.label }}</p>
        <p class="text-[11px] leading-snug text-lens/80 text-balance">{{ b.note ? t(`catch.notes.${b.id}`) : t('catch.always') }}</p>
        <p class="num mt-auto pt-1 text-xl leading-none" :style="{ color: chanceColor(b.p) }">{{ pct(b.p) }}</p>
        <p class="text-[11px] tabular-nums text-dim">
          {{ b.p > 0 ? t('catch.inFive', { chance: pct(1 - Math.pow(1 - b.p, 5)) }) : t('catch.never') }}
        </p>
      </li>
    </ul>
    <p class="mt-3 text-[11px] text-dim">{{ t('catch.footnote', { rate: catchRate }) }}</p>
  </div>
</template>
