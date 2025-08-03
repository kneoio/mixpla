<template>
  <div class="animated-text-container" :class="`animation-${animationType}`">
    <div v-if="animationType === 'gradient'" class="gradient-text">
      {{ text }}
    </div>
    <div v-else-if="animationType === 'bounce'" class="bounce-text">
      <span v-for="(char, index) in textChars" :key="index" :style="{ animationDelay: `${index * 0.1}s` }">
        {{ char === ' ' ? '\u00A0' : char }}
      </span>
    </div>
    <div v-else-if="animationType === 'wave'" class="wave-text">
      <span v-for="(char, index) in textChars" :key="index" :style="{ animationDelay: `${index * 0.1}s` }">
        {{ char === ' ' ? '\u00A0' : char }}
      </span>
    </div>
    <div v-else-if="animationType === 'typewriter'" class="typewriter-text">
      {{ displayedText }}<span class="cursor" v-if="isTyping">|</span>
    </div>
    <div v-else-if="animationType === 'glow'" class="glow-text">
      {{ text }}
    </div>
    <div v-else class="static-text">
      {{ text }}
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
    validator: (value) => ['static', 'gradient', 'bounce', 'wave', 'typewriter', 'glow'].includes(value)
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

const displayedText = ref('')
const isTyping = ref(false)
let typewriterTimeout = null

const textChars = computed(() => {
  return props.text.split('')
})

const cssVariables = computed(() => ({
  '--station-color': props.stationColor,
  '--animation-speed': `${props.speed}s`
}))

const startTypewriter = () => {
  if (props.animationType !== 'typewriter') return
  
  displayedText.value = ''
  isTyping.value = true
  let index = 0
  
  const typeChar = () => {
    if (index < props.text.length) {
      displayedText.value += props.text[index]
      index++
      typewriterTimeout = setTimeout(typeChar, 100 / props.speed)
    } else {
      setTimeout(() => {
        isTyping.value = false
      }, 500)
    }
  }
  
  typeChar()
}

watch(() => props.text, () => {
  if (props.animationType === 'typewriter') {
    startTypewriter()
  }
}, { immediate: true })

watch(() => props.animationType, () => {
  if (props.animationType === 'typewriter') {
    startTypewriter()
  }
})

onMounted(() => {
  if (props.animationType === 'typewriter') {
    startTypewriter()
  }
})

onBeforeUnmount(() => {
  if (typewriterTimeout) {
    clearTimeout(typewriterTimeout)
  }
})
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
    #ea2626,
    #e3d241,
    #6c47f8,
    var(--station-color)
  );
  background-size: 300% 300%;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: gradientShift calc(var(--animation-speed) * 3) ease-in-out infinite;
}

@keyframes gradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.bounce-text span {
  display: inline-block;
  animation: bounce calc(var(--animation-speed) * 2) ease-in-out infinite;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-10px); }
  60% { transform: translateY(-5px); }
}

.wave-text span {
  display: inline-block;
  animation: wave calc(var(--animation-speed) * 2) ease-in-out infinite;
}

@keyframes wave {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}

.typewriter-text {
  overflow: hidden;
  white-space: nowrap;
}

.cursor {
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
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
.animation-bounce,
.animation-wave,
.animation-typewriter,
.animation-glow {
  --station-color: v-bind('props.stationColor');
  --animation-speed: v-bind('props.speed + "s"');
}
</style>
