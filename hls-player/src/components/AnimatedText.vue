<template>
  <div class="animated-text-container" :class="`animation-${animationType}`" :style="styleVars">
    <transition name="animFade" mode="out-in">
      <div v-if="animationType === 'gradient'" key="gradient" class="gradient-text">
        {{ parsedText.title }}<span v-if="parsedText.artist">  •  {{ parsedText.artist }}</span>
      </div>
      <div v-else-if="animationType === 'glow'" key="glow" class="glow-text">
        {{ parsedText.title }}<span v-if="parsedText.artist">  •  {{ parsedText.artist }}</span>
      </div>
      <div v-else key="static" class="static-text">
        {{ parsedText.title }}<span v-if="parsedText.artist">  •  {{ parsedText.artist }}</span>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  text: {
    type: String,
    default: ''
  },
  animationType: {
    type: String,
    default: 'static',
    validator: (value) => ['static', 'gradient', 'glow'].includes(value)
  },
  stationColor: {
    type: String,
    default: '#3D20E4'
  },
  speed: {
    type: Number,
    default: 1
  },
  neonMode: {
    type: String,
    default: 'opposite'
  },
  neonRandomChance: {
    type: Number,
    default: 0.5
  },
  neonPalette: {
    type: Array,
    default: () => []
  },
  neonReseedOn: {
    type: String,
    default: 'text'
  },
  gradientPalettes: {
    type: Array,
    default: () => []
  },
  gradientMode: {
    type: String,
    default: 'random'
  },
  gradientIncludeStation: {
    type: Boolean,
    default: true
  },
  gradientChangeOn: {
    type: String,
    default: 'text'
  },
  gradientSpeedMultiplier: {
    type: Number,
    default: 1
  }
})

const parsedText = computed(() => {
  if (props.text.includes('|')) {
    const parts = props.text.split('|')
    return {
      title: parts[0].trim(),
      artist: parts[1].trim()
    }
  }
  return {
    title: props.text,
    artist: null
  }
})

const cssVariables = computed(() => ({
  '--station-color': props.stationColor,
  '--animation-speed': `${props.speed}s`
}))

const defaultNeonPalette = ['#39FF14','#FF073A','#FF6EC7','#00FFFF','#7DF9FF','#F4F269','#B026FF','#FF9900']
const defaultGradientPalettes = [
  ['#FF6EC7','#39FF14','#00FFFF'],
  ['#FF073A','#F4F269','#7DF9FF'],
  ['#B026FF','#FF9900','#00FFFF'],
  ['#39FF14','#FF9900','#FF6EC7']
]

const selectedNeon = ref('')
const selectedGradient = ref([])

const hexToRgb = (hex) => {
  let h = hex.replace('#','')
  if (h.length === 3) h = h.split('').map(c=>c+c).join('')
  const r = parseInt(h.substring(0,2),16)
  const g = parseInt(h.substring(2,4),16)
  const b = parseInt(h.substring(4,6),16)
  return { r, g, b }
}

const toHex = (n) => n.toString(16).padStart(2,'0')
const complementHex = (hex) => {
  const { r, g, b } = hexToRgb(hex)
  const cr = 255 - r
  const cg = 255 - g
  const cb = 255 - b
  return `#${toHex(cr)}${toHex(cg)}${toHex(cb)}`
}

const getNeonPalette = computed(() => props.neonPalette.length ? props.neonPalette : defaultNeonPalette)
const getGradientPalettes = computed(() => props.gradientPalettes.length ? props.gradientPalettes : defaultGradientPalettes)

const reseedNeon = () => {
  if (props.neonMode === 'opposite') {
    selectedNeon.value = complementHex(props.stationColor)
  } else if (props.neonMode === 'random') {
    const pool = getNeonPalette.value
    selectedNeon.value = pool[Math.floor(Math.random()*pool.length)]
  } else {
    const useOpposite = Math.random() >= (1 - props.neonRandomChance)
    if (useOpposite) {
      selectedNeon.value = complementHex(props.stationColor)
    } else {
      const pool = getNeonPalette.value
      selectedNeon.value = pool[Math.floor(Math.random()*pool.length)]
    }
  }
}

const reseedGradient = () => {
  const palettes = getGradientPalettes.value
  if (!palettes.length) { selectedGradient.value = []; return }
  if (props.gradientMode === 'sequential') {
    const idx = Math.floor(Date.now() / 1000) % palettes.length
    selectedGradient.value = palettes[idx]
  } else {
    selectedGradient.value = palettes[Math.floor(Math.random()*palettes.length)]
  }
}

onMounted(() => {
  reseedNeon()
  reseedGradient()
})

watch(() => props.text, () => {
  if (props.neonReseedOn === 'text') reseedNeon()
  if (props.gradientChangeOn === 'text') reseedGradient()
})

watch(() => props.stationColor, () => {
  if (props.neonMode !== 'random') reseedNeon()
})

const glowColor = computed(() => selectedNeon.value || props.stationColor)

const gradientStops = computed(() => {
  const stops = [...(selectedGradient.value || [])]
  if (props.gradientIncludeStation) stops.push(props.stationColor)
  return stops.join(', ')
})

const styleVars = computed(() => {
  const animSpeed = props.animationType === 'gradient' ? (props.speed * props.gradientSpeedMultiplier) : props.speed
  const style = {
    '--animation-speed': `${animSpeed}s`
  }
  if (props.animationType === 'glow') style['--station-color'] = glowColor.value
  else style['--station-color'] = props.stationColor
  if (props.animationType === 'gradient') style['--gradient-stops'] = gradientStops.value
  return style
})
</script>

<style scoped>
.animated-text-container {
  display: inline-block;
  font-size: inherit;
  color: inherit;
}

.gradient-text {
  background: linear-gradient(45deg, var(--gradient-stops, var(--station-color), #ff3366, #ffcc00, #00ccff, #ff6600, var(--station-color)));
  background-size: 400% 400%;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: gradientShift calc(var(--animation-speed) * 4) cubic-bezier(0.4, 0, 0.2, 1) infinite;
  will-change: background-position, background-size, filter;
}

@keyframes gradientShift {
  0% {
    background-position: 0% 50%;
    background-size: 360% 360%;
    filter: brightness(1);
  }
  25% {
    background-position: 50% 50%;
    background-size: 380% 380%;
    filter: brightness(1.08);
  }
  50% {
    background-position: 100% 50%;
    background-size: 400% 400%;
    filter: brightness(1.15);
  }
  75% {
    background-position: 50% 50%;
    background-size: 380% 380%;
    filter: brightness(1.08);
  }
  100% {
    background-position: 0% 50%;
    background-size: 360% 360%;
    filter: brightness(1);
  }
}


.glow-text {
  color: var(--station-color);
  text-shadow: 
    0 0 4px var(--station-color),
    0 0 8px var(--station-color),
    0 0 12px var(--station-color);
  animation: glowPulse calc(var(--animation-speed) * 2.5) cubic-bezier(0.4, 0, 0.2, 1) infinite;
  transition: text-shadow 0.6s ease, color 0.6s ease, filter 0.6s ease;
  will-change: text-shadow, filter;
}

@keyframes glowPulse {
  0% {
    text-shadow:
      0 0 3px var(--station-color),
      0 0 6px var(--station-color),
      0 0 9px var(--station-color);
    filter: brightness(1);
  }
  25% {
    text-shadow:
      0 0 6px var(--station-color),
      0 0 12px var(--station-color),
      0 0 18px var(--station-color);
    filter: brightness(1.06);
  }
  50% {
    text-shadow:
      0 0 10px var(--station-color),
      0 0 20px var(--station-color),
      0 0 30px var(--station-color);
    filter: brightness(1.12);
  }
  75% {
    text-shadow:
      0 0 6px var(--station-color),
      0 0 12px var(--station-color),
      0 0 18px var(--station-color);
    filter: brightness(1.06);
  }
  100% {
    text-shadow:
      0 0 3px var(--station-color),
      0 0 6px var(--station-color),
      0 0 9px var(--station-color);
    filter: brightness(1);
  }
}

.static-text {
  color: inherit;
}

.animation-gradient,
.animation-glow {
  --station-color: v-bind('props.stationColor');
  --animation-speed: v-bind('props.speed + "s"');
}

@media (prefers-reduced-motion: reduce) {
  .gradient-text,
  .glow-text {
    animation: none !important;
  }
}

/* transition for activation/deactivation */
.animFade-enter-active,
.animFade-leave-active {
  transition: opacity 0.35s ease, filter 0.35s ease, transform 0.35s ease;
}
.animFade-enter-from,
.animFade-leave-to {
  opacity: 0;
  filter: blur(4px) brightness(0.95);
  transform: translateY(2px);
}
.animFade-enter-to,
.animFade-leave-from {
  opacity: 1;
  filter: blur(0) brightness(1);
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .animFade-enter-active,
  .animFade-leave-active {
    transition-duration: 0.15s;
    transition-property: opacity;
  }
  .animFade-enter-from,
  .animFade-leave-to {
    filter: none;
    transform: none;
  }
}
</style>
