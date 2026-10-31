<script>
// `centred`: shift per image URL, in native pixels; an image is measured once per page load, so a sprite rendered
// again later (a new search, another page) is drawn in place from its first paint
const shifts = new Map()
let canvas = null

/** native-pixel vertical shift that centres the visible pixels of a loaded image on its canvas; 0 if unreadable */
function centreShift(img) {
  const { naturalWidth: w, naturalHeight: h } = img
  if (!w || !h) return 0
  canvas ??= document.createElement('canvas')
  canvas.width = w // resizing also clears it
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return 0
  ctx.drawImage(img, 0, 0)
  let data
  try {
    data = ctx.getImageData(0, 0, w, h).data
  } catch {
    return 0 // a cross-origin image taints the canvas
  }
  let top = -1
  let bottom = -1
  for (let y = 0; y < h; y++) {
    for (let i = y * w * 4 + 3, end = (y + 1) * w * 4; i < end; i += 4) {
      if (data[i]) {
        if (top < 0) top = y
        bottom = y
        break
      }
    }
  }
  return top < 0 ? 0 : Math.round((h - top - bottom - 1) / 2)
}
</script>

<script setup>
// Pixel sprite at an integer scale only: a fractional factor drops or doubles pixel rows under `pixelated`.
// `w`/`h` are the sprite's native size (gen3/frlg/shiny 64×64, icons 68×56, balls 30×30, trainers 80×80).
// `max-w-none` keeps a narrow container from shrinking it to a fractional size; plain attributes
// (e.g. `loading="eager"` for an above-the-fold sprite) fall through and override the defaults.
// `centred` is for sprites drawn off-centre on their canvas: the Gen 8 box icons stand on the canvas floor under
// an empty band, so in a row they sit low. Their visible pixels are measured once loaded and the drawing is moved
// inside the same box (object-position, whole pixels) until they are centred vertically: the box keeps its size,
// nothing around it moves, and a drawing is never taller than its canvas, so nothing is cut off.
import { computed, ref, watch } from 'vue'

const props = defineProps({
  src: { type: String, required: true },
  alt: { type: String, required: true },
  w: { type: Number, default: 64 },
  h: { type: Number, default: null }, // defaults to `w` (square sprite)
  scale: { type: Number, default: 1 },
  centred: { type: Boolean, default: false },
})

const factor = computed(() => Math.max(1, Math.round(props.scale) || 1))
const width = computed(() => props.w * factor.value)
const height = computed(() => (props.h ?? props.w) * factor.value)

// a new src keeps the previous shift until it loads (the previous image stays on screen meanwhile)
const shift = ref(shifts.get(props.src) ?? 0)
watch(() => props.src, (src) => {
  if (shifts.has(src)) shift.value = shifts.get(src)
})

function onLoad(e) {
  if (!props.centred) return
  if (!shifts.has(props.src)) shifts.set(props.src, centreShift(e.target))
  shift.value = shifts.get(props.src)
}

const style = computed(() => (props.centred && shift.value ? { objectPosition: `0 ${shift.value * factor.value}px` } : null))
</script>

<template>
  <img
    :src="src"
    :alt="alt"
    :width="width"
    :height="height"
    :style="style"
    class="pixelated max-w-none shrink-0"
    loading="lazy"
    decoding="async"
    @load="onLoad"
  />
</template>
