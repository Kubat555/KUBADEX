<script>
// One page scroll lock shared by all sheets (one can open over another, e.g. "More" over a page's sheet that Back
// brought back): the first lock saves the page's own overflow, the last release puts it back, in any close order.
let locks = 0
let pageOverflow = ''
</script>

<script setup>
// Phone (<640px): a bottom sheet. A modal <dialog> sits in the top layer (no z-index fights, background inert);
// Tab is kept inside, Esc / the Android back gesture / a tap on the scrim / the close button emit `close`,
// and page scroll is locked while it is open. The parent owns `open` and flips it on `close`.
// Leaving a kept-alive view closes its sheet (emits `close`), unless `keepWhenCached`: a sheet whose open state comes
// from the view's URL (a selected move, place) stays open while the view is cached, and Back shows it again with its
// list where it was left, unless `contentKey` (what it shows) has changed meanwhile.
// Wider screens: no dialog and `open` is ignored — the slot renders in place inside a plain <div> that receives
// the attributes given to <Sheet> (class, style), so the parent styles its desktop panel through them.
import { computed, nextTick, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, useId, watch } from 'vue'
import Icon from './Icon.vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  closeLabel: { type: String, default: 'Close' }, // accessible name of the close button (pass the localized word)
  contentKey: { type: String, default: null }, // what the sheet shows (the selected move, place); another one starts at the top
  keepWhenCached: { type: Boolean, default: false }, // the open state lives in the view's URL: survive the view being cached
})
const emit = defineEmits(['close'])

const mql = typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 639px)') : null
const isPhone = ref(mql?.matches ?? false)
const shown = computed(() => isPhone.value && props.open)

const titleId = useId()
const dialog = ref(null)
const panel = ref(null)
const box = ref(null) // the panel's scrolling body
const visible = ref(false) // scrim and panel are rendered; toggling it runs the enter/leave transitions
let returnFocus = null
let locked = false // this sheet holds one of the page scroll locks
let deactivated = false // a kept-alive view holding the sheet is cached: its DOM is detached from the document
// The body's scroll offset, put back when a cached view is shown again: a hidden or detached element loses it,
// so it is tracked while scrolling (not read on the way out). A new panel or another `contentKey` starts at 0.
let boxScroll = 0
const onBoxScroll = (e) => {
  if (!deactivated) boxScroll = e.target.scrollTop
}
watch(() => props.contentKey, () => {
  boxScroll = 0
  if (box.value && shown.value) box.value.scrollTop = 0 // not while closing: the leaving panel would jump
})

function lockScroll() {
  if (locked) return
  locked = true
  if (locks++ === 0) {
    pageOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
  }
}
function unlockScroll() {
  if (!locked) return
  locked = false
  if (--locks === 0) document.documentElement.style.overflow = pageOverflow
}

async function show() {
  await nextTick() // the <dialog> is rendered in the same update that made `shown` true
  const d = dialog.value
  // a cached view still updates while detached (Back restores its selection before it is shown again), and
  // showModal() throws outside the document: onActivated shows the sheet once the view is back
  if (!d || !shown.value || deactivated || !d.isConnected) return
  if (!d.open) {
    returnFocus = document.activeElement
    d.showModal?.()
  }
  lockScroll()
  if (!visible.value) boxScroll = 0 // a new panel; a kept one (Back) is shown again as it was
  visible.value = true
  await nextTick()
  if (box.value) box.value.scrollTop = boxScroll
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

// no transition: unmount, deactivation (a sheet not kept), growing past the breakpoint
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
// a kept-alive view left with the sheet open (e.g. a link inside it was followed): the dialog closes and the page
// scroll is released, so neither outlives the page. With `keepWhenCached` the sheet stays open for the parent and
// keeps its panel (the view's URL still holds the selection, and Back shows the same panel again); any other sheet
// closes for real, so it is closed when the view comes back
onDeactivated(() => {
  deactivated = true
  if (props.keepWhenCached) return release()
  if (shown.value) emit('close')
  teardown()
})
// the view is shown again (e.g. Back): reopen the sheet if it is (still or again) open
onActivated(() => {
  if (!deactivated) return // the first activation comes right after mount, which has shown it already
  deactivated = false
  if (shown.value) show()
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

// the browser closed the dialog on its own (Chrome closes it on a repeated back/Esc it no longer lets us cancel);
// not the close of a cached view, which keeps its panel
function onNativeClose() {
  if (!visible.value || deactivated) return
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
        <header class="flex shrink-0 items-center justify-between gap-3 pt-1 pr-1.5 pb-2 pl-4">
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
        <div
          ref="box"
          class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          @scroll.passive="onBoxScroll"
        >
          <slot />
        </div>
      </section>
    </Transition>
  </dialog>
</template>
