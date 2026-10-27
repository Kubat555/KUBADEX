<script setup>
// Phone (<640px): a bottom sheet. A modal <dialog> sits in the top layer (no z-index fights, background inert);
// Tab is kept inside, Esc / the Android back gesture / a tap on the scrim / the close button emit `close`,
// and page scroll is locked while it is open. The parent owns `open` and flips it on `close`.
// Wider screens: no dialog and `open` is ignored — the slot renders in place inside a plain <div> that receives
// the attributes given to <Sheet> (class, style), so the parent styles its desktop panel through them.
import { computed, nextTick, onBeforeUnmount, onDeactivated, onMounted, ref, useId, watch } from 'vue'
import Icon from './Icon.vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  closeLabel: { type: String, default: 'Close' }, // accessible name of the close button (pass the localized word)
})
const emit = defineEmits(['close'])

const mql = typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 639px)') : null
const isPhone = ref(mql?.matches ?? false)
const shown = computed(() => isPhone.value && props.open)

const titleId = useId()
const dialog = ref(null)
const panel = ref(null)
const visible = ref(false) // scrim and panel are rendered; toggling it runs the enter/leave transitions
let returnFocus = null
let savedOverflow = null // the page's own overflow value while the sheet locks scrolling

function lockScroll() {
  if (savedOverflow !== null) return
  savedOverflow = document.documentElement.style.overflow
  document.documentElement.style.overflow = 'hidden'
}
function unlockScroll() {
  if (savedOverflow === null) return
  document.documentElement.style.overflow = savedOverflow
  savedOverflow = null
}

async function show() {
  await nextTick() // the <dialog> is rendered in the same update that made `shown` true
  const d = dialog.value
  if (!d || !shown.value) return
  if (!d.open) {
    returnFocus = document.activeElement
    d.showModal?.()
  }
  lockScroll()
  visible.value = true
  await nextTick()
  panel.value?.focus({ preventScroll: true })
}

// close the dialog, release the page scroll, return focus to whatever opened the sheet
function release() {
  if (dialog.value?.open) dialog.value.close()
  unlockScroll()
  if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true })
  returnFocus = null
}

// the panel's leave transition has ended
function onAfterLeave() {
  if (!shown.value) release() // unless it was reopened meanwhile
}

// no transition: unmount, deactivation, growing past the breakpoint
function teardown() {
  visible.value = false
  release()
}

watch(shown, (v) => {
  if (v) show()
  else if (isPhone.value) visible.value = false // onAfterLeave releases
  else teardown() // the dialog is being unmounted, its transition would never finish
})

function onMedia(e) {
  isPhone.value = e.matches
  if (!e.matches && props.open) emit('close')
}

onMounted(() => {
  mql?.addEventListener('change', onMedia)
  if (shown.value) show()
})
onBeforeUnmount(() => {
  mql?.removeEventListener('change', onMedia)
  teardown()
})
// a kept-alive view left with the sheet open (e.g. a link inside it was followed): close for real,
// otherwise the scroll lock would outlive the page
onDeactivated(() => {
  if (shown.value) emit('close')
  teardown()
})

const FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex]'

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault() // handled here, so the browser does not also fire `cancel`
    emit('close')
    return
  }
  if (e.key !== 'Tab' || !panel.value) return
  const items = [...panel.value.querySelectorAll(FOCUSABLE)].filter(
    (el) => el.tabIndex >= 0 && !el.disabled && el.getClientRects().length > 0,
  )
  if (!items.length) return e.preventDefault()
  const first = items[0]
  const last = items[items.length - 1]
  const active = document.activeElement
  if (e.shiftKey && (active === first || active === panel.value)) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && active === last) {
    e.preventDefault()
    first.focus()
  }
}

// the browser closed the dialog on its own (Chrome closes it on a repeated back/Esc it no longer lets us cancel)
function onNativeClose() {
  if (!visible.value) return
  visible.value = false
  unlockScroll()
  emit('close')
}
</script>

<template>
  <div v-if="!isPhone" v-bind="$attrs"><slot /></div>
  <dialog
    v-else
    ref="dialog"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="titleId"
    class="fixed inset-0 m-0 size-full max-h-none max-w-none overflow-hidden bg-transparent p-0 text-ink backdrop:bg-transparent"
    @keydown="onKeydown"
    @cancel.prevent="emit('close')"
    @close="onNativeClose"
  >
    <Transition
      enter-active-class="transition-opacity duration-(--dur-2) ease-out"
      leave-active-class="transition-opacity duration-(--dur-2) ease-out"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="visible" aria-hidden="true" class="absolute inset-0 bg-bg/75" @click="emit('close')" />
    </Transition>
    <Transition
      enter-active-class="transition-transform duration-(--dur-3) ease-out"
      leave-active-class="transition-transform duration-(--dur-2) ease-in"
      enter-from-class="translate-y-full"
      leave-to-class="translate-y-full"
      @after-leave="onAfterLeave"
    >
      <section
        v-if="visible"
        ref="panel"
        tabindex="-1"
        class="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-line-strong bg-surface-1 shadow-[0_-16px_40px_rgb(0_0_0/0.45)] outline-none"
      >
        <div aria-hidden="true" class="mx-auto mt-2 h-1 w-10 shrink-0 bg-line-strong" />
        <header class="flex shrink-0 items-center justify-between gap-3 pt-1 pr-1.5 pl-4">
          <h2 :id="titleId" class="min-w-0 truncate font-display text-base uppercase tracking-wider">{{ title }}</h2>
          <button
            type="button"
            :aria-label="closeLabel"
            class="grid size-11 shrink-0 place-items-center rounded-lg text-muted transition-colors duration-(--dur-1) hover:text-ink active:translate-y-px"
            @click="emit('close')"
          >
            <Icon name="close" />
          </button>
        </header>
        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <slot />
        </div>
      </section>
    </Transition>
  </dialog>
</template>
