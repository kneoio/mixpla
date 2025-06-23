<template>
  <div id="hls-player-container">
    
    <audio ref="audioPlayer" style="display: none;"></audio>

    <div class="player-content">
      <!-- Station Info -->
      <div class="station-info" :style="darkThemeTextStyle">
        <h1 class="station-name">{{ stationName }}</h1>
        <div class="curator-info" :style="[{ visibility: curatorText ? 'visible' : 'hidden' }, dynamicColorStyle]">
          {{ displayedCuratorText }}<span class="blinking-cursor" v-if="isTyping">|</span>
        </div>
      </div>

      <!-- Now Playing Info -->
      <div class="now-playing-info" :style="darkThemeTextStyle">
        <div class="now-playing-ticker"><span>{{ nowPlaying }}</span></div>
      </div>

      <!-- Controls -->
      <div class="controls">
        <n-button @click="togglePlay" type="primary" circle strong size="large" :disabled="isWarmingUp || isWaitingForCurator">
          <template #icon>
            <n-icon :component="playIcon" />
          </template>
        </n-button>
      </div>

      <!-- Buffer Status Indicator is now in App.vue -->

      <!-- Station Status Text -->
      <div class="station-status">
        <span>{{ statusText }}</span>
      </div>
    </div>


  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { useUiStore } from '../stores/ui';
import { useStationStore } from '../stores/station';
import { storeToRefs } from 'pinia';
import { NButton, NIcon } from 'naive-ui';
import PlayerPlay from '@vicons/tabler/es/PlayerPlay';
import PlayerPause from '@vicons/tabler/es/PlayerPause';
import Hls from 'hls.js';

// --- Refs and State ---
const audioPlayer = ref(null);


let hls = null;
const isPlaying = ref(false);

const uiStore = useUiStore();
const stationStore = useStationStore();
const { radioName, stationName, statusText, nowPlaying, isAsleep, isWaitingForCurator, isWarmingUp, djName, djStatus, stationColor } = storeToRefs(stationStore); // Use storeToRefs for reactivity

const displayedCuratorText = ref('');
let typingTimeout = null;
let retypeInterval = null;

// Audio visualizer state
let audioCtx = null;
let analyser = null;
let source = null;
let animationFrameId = null;

// --- Computed Properties ---
const playIcon = computed(() => (isPlaying.value ? PlayerPause : PlayerPlay));

const isTyping = ref(false);

const curatorText = computed(() => {
  if (djName.value && djStatus.value === 'CONTROLLING') {
    return `Curated by ${djName.value}`;
  }
  return null;
});


const dynamicColorStyle = computed(() => {
  const color = stationColor.value || (uiStore.theme === 'dark' ? '#FFFFFF' : '#000000');
  return { color };
});

const darkThemeTextStyle = computed(() => {
  if (uiStore.theme === 'dark') {
    return {
      color: '#E0E0E0',
      textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)'
    };
  }
  return {};
});

// --- Watchers ---
const startTypingAnimation = (text) => {
  if (typingTimeout) clearTimeout(typingTimeout);
  displayedCuratorText.value = '';
  isTyping.value = false;

  if (text) {
    isTyping.value = true;
    let i = 0;
    const type = () => {
      if (i < text.length) {
        displayedCuratorText.value += text.charAt(i);
        i++;
        typingTimeout = setTimeout(type, 100);
      } else {
        isTyping.value = false;
      }
    };
    type();
  }
};

watch(curatorText, (newText, oldText) => {
  if (retypeInterval) clearInterval(retypeInterval);
  
  if (newText) {
    startTypingAnimation(newText); // Type immediately
    retypeInterval = setInterval(() => {
      startTypingAnimation(newText); // Retype every 15s
    }, 15000);
  } else {
    startTypingAnimation(null); // Clear text and stop typing
  }
});

watch(
  () => ({
    name: radioName.value,
    asleep: isAsleep.value,
    waiting: isWaitingForCurator.value,
  }),
  (newStatus, oldStatus) => {
    // Destroy the player if the station is no longer playable
    if (newStatus.asleep || newStatus.waiting) {
      if (hls) {
        console.log(`[Player] Station ${newStatus.name} is not playable. Destroying HLS instance.`);
        hls.destroy();
        hls = null;
        isPlaying.value = false;
      }
      return;
    }

    // Initialize the player if the station is now playable
    if (newStatus.name && !newStatus.asleep && !newStatus.waiting) {
      const nameChanged = oldStatus ? newStatus.name !== oldStatus.name : true;
      const justWokeUp = oldStatus ? oldStatus.asleep && !newStatus.asleep : false;
      const justBecameReady = oldStatus ? oldStatus.waiting && !newStatus.waiting : false;

      if (nameChanged || justWokeUp || justBecameReady) {
        console.log(`[Player] Station ${newStatus.name} is now playable. Initializing HLS.`);
        const delay = justWokeUp ? 2500 : 0;
        setTimeout(() => {
          initializeHls(newStatus.name);
        }, delay);
      }
    }
  },
  { deep: true, immediate: true }
);

// --- Player Logic ---
const togglePlay = () => {
  if (isAsleep.value) {
    stationStore.wakeUpStation();
    return;
  }
  if (isWaitingForCurator.value) {
    return;
  }
  if (!audioPlayer.value) return;

  // On iOS, AudioContext must be resumed by a user gesture.
  // This ensures that if context exists and is suspended, a click will resume it.
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  if (audioPlayer.value.paused) {
    audioPlayer.value.play().catch(e => console.error('Play error:', e));
  } else {
    audioPlayer.value.pause();
  }
};

const initializeHls = (radioName) => {
  if (hls) {
    hls.destroy();
  }
  if (!Hls.isSupported()) {
    console.error("HLS is not supported in this browser.");
    return;
  }

    const streamUrl = `${import.meta.env.VITE_STREAM_BASE_URL}/${radioName}/radio/stream.m3u8`;
  hls = new Hls({
    debug: false,
    maxBufferLength: 30,
    maxMaxBufferLength: 600,
    fragLoadingTimeOut: 20000,
    manifestLoadingTimeOut: 10000,
    levelLoadingTimeOut: 10000,
  });

  hls.loadSource(streamUrl);
  hls.attachMedia(audioPlayer.value);



  hls.on(Hls.Events.MANIFEST_PARSED, () => {
    console.log('[Player] Manifest parsed, attempting to play...');
    audioPlayer.value.play().catch(e => {
        console.error('Error on autoplay:', e);
    });
  });
  
  hls.on(Hls.Events.FRAG_CHANGED, (event, data) => {
    const fragTitle = data.frag.title;
    if (fragTitle) {
      stationStore.nowPlaying = fragTitle;
    }
  });

  hls.on(Hls.Events.FRAG_BUFFERED, (event, data) => {
    if (stationStore.bufferStatus === 'stalling') {
      stationStore.setBufferStatus('ok');
    }
  });

  hls.on(Hls.Events.ERROR, (event, data) => {
    if (data.fatal) {
      console.error('HLS.js fatal error:', data);
      stationStore.setBufferStatus('fatal');
      // Attempt to recover
      switch (data.type) {
        case Hls.ErrorTypes.NETWORK_ERROR:
          console.error("Fatal network error, trying to recover...");
          hls.startLoad();
          break;
        case Hls.ErrorTypes.MEDIA_ERROR:
          console.error("Fatal media error, trying to recover...");
          hls.recoverMediaError();
          break;
        default:
          console.error("Unrecoverable error, destroying HLS instance.");
          hls.destroy();
          break;
      }
    }
  });

  hls.on(Hls.Events.BUFFER_STALLED, (event, data) => {
    stationStore.setBufferStatus('stalling');
  });
};



function setupAudioVisualizer() {
  if (!audioPlayer.value) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  source = audioCtx.createMediaElementSource(audioPlayer.value);

  source.connect(analyser);
  analyser.connect(audioCtx.destination);

  analyser.fftSize = 32;
}

function renderFrame() {
  if (!analyser) return; // Safety check

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteTimeDomainData(dataArray);

  let sum = 0;
  for (let i = 0; i < bufferLength; i++) {
    const val = dataArray[i] / 128.0 - 1.0;
    sum += val * val;
  }
  const rms = Math.sqrt(sum / bufferLength);
  stationStore.animationIntensity = Math.min(rms * 5, 1.0);

  // Keep the loop going
  animationFrameId = requestAnimationFrame(renderFrame);
}

// --- Lifecycle Hooks ---
onMounted(() => {
  const audio = audioPlayer.value;
  if (!audio) return;

  const onPlay = () => {
    isPlaying.value = true;
    // One-time setup for the visualizer, triggered by the first actual play event.
    if (!audioCtx) {
      setupAudioVisualizer();
    }
    // Start the animation loop.
    renderFrame();
  };

  const onPauseOrEnd = () => {
    isPlaying.value = false;
    // Stop the animation loop.
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };

  audio.addEventListener('play', onPlay);
  audio.addEventListener('pause', onPauseOrEnd);
  audio.addEventListener('ended', onPauseOrEnd);
});

onBeforeUnmount(() => {
  if (hls) {
    hls.destroy();
  }
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  if (typingTimeout) clearTimeout(typingTimeout);
  if (retypeInterval) clearInterval(retypeInterval);
  if (audioCtx) {
    audioCtx.close();
  }
});
</script>

<style scoped>
.player-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.now-playing-info {
  text-align: center;
}

.title {
  font-size: 1.2rem;
  font-weight: bold;
}

.artist {
  font-size: 1rem;
}

.station-info {
  text-align: center;
}

.station-name {
  font-weight: bold;
  font-size: 1.5rem;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.station-status {
  font-size: 0.75rem;
  color: #aaa;
  min-height: 1em; /* Reserve space to prevent layout shift */
}

.curator-info {
  font-family: 'Goldman', sans-serif;
  font-size: 0.85rem;
  margin-top: 4px;
  min-height: 1.2em; /* Reserve space to prevent layout jump */
}

.blinking-cursor {
  animation: blink-opacity 1s step-end infinite;
  font-weight: bold;
  margin-left: 2px;
}

@keyframes blink-opacity {
  from, to { opacity: 0; }
  50% { opacity: 1; }
}





</style>
