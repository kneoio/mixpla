<template>
  <div class="animated-text-container" :class="`animation-${animationType}`">
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
</script>

<style scoped>
.animated-text-container {
  display: inline-block;
  font-size: inherit;
  color: inherit;
}

.gradient-text {
  background: linear-gradient(
    45deg,
    var(--station-color),
    #ff3366,
    #ffcc00,
    #00ccff,
    #ff6600,
    var(--station-color)
  );
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
