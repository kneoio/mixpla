<template>
  <div class="animated-text-container" :class="`animation-${animationType}`">
    <div v-if="animationType === 'gradient'" class="gradient-text">
      {{ parsedText.title }}<span v-if="parsedText.artist"> • {{ parsedText.artist }}</span>
    </div>
    <div v-else-if="animationType === 'glow'" class="glow-text">
      {{ parsedText.title }}<span v-if="parsedText.artist"> • {{ parsedText.artist }}</span>
    </div>
    <div v-else class="static-text">
      {{ parsedText.title }}<span v-if="parsedText.artist"> • {{ parsedText.artist }}</span>
    </div>
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
  animation: gradientShift calc(var(--animation-speed) * 3) ease-in-out infinite;
}

@keyframes gradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}


.glow-text {
  color: var(--station-color);
  text-shadow: 
    0 0 5px var(--station-color),
    0 0 10px var(--station-color),
    0 0 15px var(--station-color);
  animation: glow calc(var(--animation-speed) * 2) ease-in-out infinite alternate;
}

@keyframes glow {
  from {
    text-shadow: 
      0 0 5px var(--station-color),
      0 0 10px var(--station-color),
      0 0 15px var(--station-color);
  }
  to {
    text-shadow: 
      0 0 10px var(--station-color),
      0 0 20px var(--station-color),
      0 0 30px var(--station-color);
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
</style>
