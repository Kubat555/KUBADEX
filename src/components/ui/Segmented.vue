<script setup>
// One of N (radio group): a raised `surface-2` plate and a 2px red indicator mark the choice.
// Roving tabindex: Tab reaches the group once, arrows move the choice and the focus (wrapping at the ends).
// Sized to the labels; with `w-full` the options split the row evenly, never narrower than their label.
// Height follows the control scale: `md` 40px (default), `sm` 32px for tight rows such as the header.
const props = defineProps({
  modelValue: { type: [String, Number, Boolean], default: null },
  options: { type: Array, required: true }, // [{ value, label }]
  label: { type: String, required: true },
  size: { type: String, default: 'md', validator: (v) => v === 'md' || v === 'sm' },
})
const emit = defineEmits(['update:modelValue'])

const STEP = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
const buttons = []

// the option that takes the Tab stop: the selected one, else the first
function tabStop(i) {
  const selected = props.options.findIndex((o) => o.value === props.modelValue)
  return i === (selected === -1 ? 0 : selected)
}

function select(i) {
  const value = props.options[i].value
  if (value !== props.modelValue) emit('update:modelValue', value)
}

function onKeydown(e, i) {
  const step = STEP[e.key]
  // Alt/Cmd+arrow belong to the browser (history, text navigation)
  if (!step || e.altKey || e.ctrlKey || e.metaKey) return
  e.preventDefault()
  const n = props.options.length
  const next = (i + step + n) % n
  select(next)
  buttons[next]?.focus()
}
</script>

<template>
  <div
    role="radiogroup"
    :aria-label="label"
    class="inline-flex gap-0.5 rounded-lg border border-line-strong bg-surface-1 p-[3px]"
    :class="size === 'sm' ? 'h-8' : 'h-10'"
  >
    <button
      v-for="(o, i) in options"
      :key="String(o.value)"
      :ref="(el) => (buttons[i] = el)"
      type="button"
      role="radio"
      :aria-checked="o.value === modelValue"
      :tabindex="tabStop(i) ? 0 : -1"
      class="relative min-w-max flex-1 rounded font-display text-sm uppercase leading-none tracking-wider whitespace-nowrap transition-colors duration-(--dur-2) ease-out active:translate-y-px"
      :class="[
        size === 'sm' ? 'px-2' : 'px-3',
        o.value === modelValue ? 'bg-surface-2 text-ink' : 'text-muted hover:bg-surface-2/50 hover:text-ink',
      ]"
      @click="select(i)"
      @keydown="onKeydown($event, i)"
    >
      {{ o.label }}
      <span
        aria-hidden="true"
        class="absolute inset-x-2 bottom-0.5 h-0.5 bg-dexglow transition-opacity duration-(--dur-2) ease-out"
        :class="o.value === modelValue ? 'opacity-100' : 'opacity-0'"
      />
    </button>
  </div>
</template>
