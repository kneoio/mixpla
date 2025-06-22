<template>
  <div id="hls-player-container">
    
    <audio ref="audioPlayer" style="display: none;"></audio>

    <div class="player-content">
      <!-- Station Info -->
      <div class="station-info" :style="darkThemeTextStyle">
        <h1 class="station-name">{{ stationName }}</h1>
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

      <!-- Buffer Status -->
      <div class="status-indicator-wrapper">
        <div :class="['buffer-indicator', indicatorClass]"></div>
        <span>{{ bufferStatusText }}</span>
      </div>

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

const bufferStatus = ref('ok'); // ok, stalling, fatal

const indicatorClass = computed(() => {
  if (isWaitingForCurator.value) {
    return 'waiting';
  }
  return bufferStatus.value;
});

const bufferStatusText = computed(() => {
  switch (bufferStatus.value) {
    case 'ok':
      return 'Healthy';
    case 'stalling':
      return 'Unstable';
    case 'fatal':
      return 'Not Available';
    default:
      return '...';
  }
});

const uiStore = useUiStore();
const stationStore = useStationStore();
const { radioName, stationName, statusText, nowPlaying, isAsleep, isWaitingForCurator, isWarmingUp } = storeToRefs(stationStore); // Use storeToRefs for reactivity
const successfulFragmentsAfterStall = ref(0);

// Audio visualizer state
let audioCtx = null;
let analyser = null;
let source = null;
let animationFrameId = null;

// --- Computed Properties ---
const playIcon = computed(() => (isPlaying.value ? PlayerPause : PlayerPlay));


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

  // Safeguard: do not play if station is waiting for curator
  if (isWaitingForCurator.value) {
    return;
  }

  if (!audioPlayer.value) return;
  if (audioPlayer.value.paused || audioPlayer.value.ended) {
    audioPlayer.value.play().catch(error => console.error('Error attempting to play audio:', error));
    if (!audioCtx) { // Initialize visualizer on first play
      setupAudioVisualizer();
    }
    renderFrame(); // Start animation loop
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

  const streamUrl = `${import.meta.env.VITE_API_BASE_URL}/${radioName}/radio/stream.m3u8`;
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

  hls.on(Hls.Events.MEDIA_ATTACHED, () => {
    setupAudioVisualizer();
  });

  hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
    console.log('Manifest loaded, found ' + data.levels.length + ' quality level');
    bufferStatus.value = 'ok';
    // Attempt to play, but handle autoplay restrictions gracefully.
    audioPlayer.value.play().then(() => {
      isPlaying.value = true;
    }).catch(error => {
      console.warn('Autoplay was prevented by the browser.');
      isPlaying.value = false; // Ensure UI shows the play button
    });
  });
  
  hls.on(Hls.Events.FRAG_CHANGED, (event, data) => {
    const fragTitle = data.frag.title;
    if (fragTitle) {
      stationStore.nowPlaying = fragTitle;
    }
  });

  hls.on(Hls.Events.FRAG_BUFFERED, (event, data) => {
    if (bufferStatus.value === 'stalling') {
      successfulFragmentsAfterStall.value++;
      if (successfulFragmentsAfterStall.value >= 2) {
        bufferStatus.value = 'ok';
        successfulFragmentsAfterStall.value = 0;
      }
    }
  });

  hls.on(Hls.Events.ERROR, (event, data) => {
    if (data.fatal) {
      console.error('HLS.js fatal error:', data);
      bufferStatus.value = 'fatal';
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
    bufferStatus.value = 'stalling';
    successfulFragmentsAfterStall.value = 0;
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
  if (!analyser) {
    animationFrameId = requestAnimationFrame(renderFrame);
    return;
  }
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteTimeDomainData(dataArray);

  let sum = 0;
  for (let i = 0; i < bufferLength; i++) {
    const val = dataArray[i] / 128.0 - 1.0; // Normalize to -1.0 to 1.0
    sum += val * val;
  }
  const rms = Math.sqrt(sum / bufferLength);
  stationStore.animationIntensity = Math.min(rms * 5, 1.0); // Amplify and clamp

  animationFrameId = requestAnimationFrame(renderFrame);
}

// --- Lifecycle Hooks ---
onMounted(() => {
  const audio = audioPlayer.value;
  if (!audio) return;

  audio.addEventListener('play', () => { isPlaying.value = true; });
  audio.addEventListener('pause', () => { isPlaying.value = false; });
  audio.addEventListener('ended', () => { isPlaying.value = false; });
});

onBeforeUnmount(() => {
  if (hls) {
    hls.destroy();
  }
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
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
  font-size: 1.5rem;
  font-weight: bold;
  margin: 0;
  line-height: 1.2;
}

.station-status {
  font-size: 0.75rem;
  color: #aaa;
  min-height: 1em; /* Reserve space to prevent layout shift */
}



.status-indicator-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: #aaa;
}

.buffer-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  transition: background-color 0.3s ease;
}

.buffer-indicator.ok {
  background-color: #4caf50; /* Green */
}

.buffer-indicator.stalling,
.buffer-indicator.fatal {
  background-color: #f44336; /* Red */
  animation: pulse-red 1.5s infinite;
}

.buffer-indicator.waiting {
  background-color: #ffc107; /* Amber/Yellow */
  animation: pulse-yellow 1.5s infinite;
}

@keyframes pulse-red {
  0% {
    box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.7);
  }
  70% {
    box-shadow: 0 0 0 8px rgba(244, 67, 54, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(244, 67, 54, 0);
  }
}

@keyframes pulse-yellow {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.7);
  }
  70% {
    box-shadow: 0 0 0 8px rgba(255, 193, 7, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 193, 7, 0);
  }
}

</style>
