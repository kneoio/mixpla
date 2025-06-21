<template>
  <div id="hls-player-container">
    
    <audio ref="audioPlayer" style="display: none;"></audio>

    <div class="player-content">
      <!-- Station Info -->
      <div class="station-info">
        <h1 class="station-name">{{ stationName }}</h1>
      </div>

      <!-- Now Playing Info -->
      <div class="now-playing-info">
        <div class="now-playing-ticker"><span>{{ nowPlaying }}</span></div>
      </div>

      <!-- Controls -->
      <div class="controls">
        <n-button @click="togglePlay" type="primary" circle strong size="large">
          <template #icon>
            <n-icon :component="playIcon" />
          </template>
        </n-button>
      </div>

      <!-- Buffer Status -->
      <div class="status-indicator-wrapper">
        <div :class="['buffer-indicator', bufferStatus]"></div>
        <span>{{ bufferStatusText }}</span>
      </div>

      <!-- Station Status Text -->
      <div class="station-status">
        <span>{{ statusText }}</span>
      </div>
    </div>

    <!-- Log console, appears when showLogs is true -->
    <div v-if="showLogs" class="log-console-wrapper">
        <pre ref="logConsoleElement" class="log-console">{{ allLogs }}</pre>
    </div>

    <!-- Log Toggle -->
    <div class="log-toggle" @click="showLogs = !showLogs">
      {{ showLogs ? 'Hide Logs' : 'Logs' }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue';
import { useUiStore } from '../stores/ui';
import { useStationStore } from '../stores/station';
import { storeToRefs } from 'pinia';
import { NButton, NIcon } from 'naive-ui';
import PlayerPlay from '@vicons/tabler/es/PlayerPlay';
import PlayerPause from '@vicons/tabler/es/PlayerPause';
import Hls from 'hls.js';

// --- Refs and State ---
const audioPlayer = ref(null);
const logConsoleElement = ref(null); // Ref for the <pre> element

let hls = null;
const isPlaying = ref(false);

const bufferStatus = ref('ok'); // ok, stalling, fatal

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
const showLogs = ref(false);
const logs = ref([]);
const LOG_CONSOLE_HEIGHT = '200px'; // Define height for JS logic
const uiStore = useUiStore();
const stationStore = useStationStore();
const { radioName, stationName, statusText, nowPlaying } = storeToRefs(stationStore); // Use storeToRefs for reactivity
const successfulFragmentsAfterStall = ref(0);

// Audio visualizer state
let audioCtx = null;
let analyser = null;
let source = null;
let animationFrameId = null;

// --- Computed Properties ---
const playIcon = computed(() => (isPlaying.value ? PlayerPause : PlayerPlay));
const allLogs = computed(() => logs.value.join('\n'));

// --- Watchers ---
watch(logs, async () => {
  if (showLogs.value && logConsoleElement.value) {
    await nextTick(); // Wait for DOM to update
    logConsoleElement.value.scrollTop = logConsoleElement.value.scrollHeight;
  }
}, { deep: true });

watch(showLogs, (newValue) => {
  const appContainer = document.getElementById('app-container'); // Assuming App.vue has id='app-container'
  if (appContainer) {
    if (newValue) {
      appContainer.style.paddingBottom = LOG_CONSOLE_HEIGHT;
    } else {
      appContainer.style.paddingBottom = '0px';
    }
  }
});

// --- Player Logic ---
const togglePlay = () => {
  if (!audioPlayer.value) return;
  if (audioPlayer.value.paused || audioPlayer.value.ended) {
    audioPlayer.value.play().catch(error => console.error('Error attempting to play audio:', error));
    isPlaying.value = true;
    if (!audioCtx) { // Initialize visualizer on first play
      setupAudioVisualizer();
    }
    renderFrame(); // Start animation loop
  } else {
    audioPlayer.value.pause();
  }
};

const addLog = (eventName, data) => {
  const logMessage = `[${new Date().toLocaleTimeString()}] ${eventName}: ${JSON.stringify(data, null, 2)}`;
  logs.value.unshift(logMessage);
  if (logs.value.length > 100) logs.value.pop();
};

const initializeHls = (radioName) => {
  if (hls) {
    hls.destroy();
  }
  if (!Hls.isSupported() || !audioPlayer.value) {
    console.error('HLS is not supported or audio player is not available.');
    return;
  }

  hls = new Hls();
  
  // Reset status on initialization
  bufferStatus.value = 'ok';
  successfulFragmentsAfterStall.value = 0;

  // Attach all event listeners
  Object.values(Hls.Events).forEach(eventName => {
    hls.on(eventName, (event, data) => addLog(eventName, data));
  });

  hls.on(Hls.Events.FRAG_CHANGED, (event, data) => {
    const fragTitle = data.frag.title;
    if (fragTitle) {
        stationStore.nowPlaying = fragTitle;
    }
  });

  hls.on(Hls.Events.BUFFER_STALLED, () => {
    if (bufferStatus.value !== 'fatal') {
      bufferStatus.value = 'stalling';
      successfulFragmentsAfterStall.value = 0;
    }
  });

  hls.on(Hls.Events.FRAG_BUFFERED, () => {
    if (bufferStatus.value === 'fatal') return;
    if (bufferStatus.value === 'stalling') {
      successfulFragmentsAfterStall.value++;
      if (successfulFragmentsAfterStall.value >= 2) {
        bufferStatus.value = 'ok';
      }
    } else {
      bufferStatus.value = 'ok';
    }
  });

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
    if (audioPlayer.value) {
      audioPlayer.value.play().catch(error => {
        console.error('Autoplay on station switch failed:', error);
        // Sync UI state in case autoplay is blocked by the browser
        isPlaying.value = !audioPlayer.value.paused;
      });
    }
  });

  hls.on(Hls.Events.ERROR, (event, data) => {
    if (data.fatal) {
      console.error('HLS.js fatal error:', data);
      bufferStatus.value = 'fatal';
      successfulFragmentsAfterStall.value = 0;
      
      // Destroy and attempt to recover
      hls.destroy();
      setTimeout(() => {
        initializeHls(stationStore.radioName);
      }, 5000);
    }
  });

    const streamUrl = `https://bratan.online/${radioName}/radio/stream.m3u8`;
  hls.loadSource(streamUrl);
  hls.attachMedia(audioPlayer.value);
};

watch(radioName, (newRadioName) => {
  if (newRadioName) {
    // If there's an existing HLS instance, destroy it before creating a new one.
    if (hls) {
      hls.destroy();
    }
    initializeHls(newRadioName);
  }
}, { immediate: true }); // immediate: true runs the watcher on component mount

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

  

  // Initial padding adjustment if logs are shown by default
  const appContainer = document.getElementById('app-container');
  if (appContainer && showLogs.value) {
    appContainer.style.paddingBottom = LOG_CONSOLE_HEIGHT;
  }
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
  // Reset padding when component is unmounted
  const appContainer = document.getElementById('app-container');
  if (appContainer) {
    appContainer.style.paddingBottom = '0px';
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
.logging-.controls {
    margin-bottom: 1rem;
}

.log-toggle {
    position: fixed;
    bottom: 10px;
    right: 15px; /* Changed back to right */
    font-size: 0.7rem;
    font-family: 'Consolas', 'Courier New', monospace;
    color: #aaa;
    cursor: pointer;
    z-index: 1001; /* To be above the log console if it overlaps */
    padding: 2px 5px;
    background-color: rgba(40, 44, 52, 0.75); /* Semi-transparent background */
    border-radius: 3px;
    transition: color 0.2s ease;
}

.log-toggle:hover {
    color: #fff;
}

.log-console-wrapper {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 200px; /* Corresponds to LOG_CONSOLE_HEIGHT in JS */
    z-index: 1000;
    background-color: #282c34;
    border-top: 1px solid #444;
    box-sizing: border-box;
    overflow: hidden;
}

.log-console {
    height: 100%;
    overflow-y: scroll;
    padding: 10px;
    color: #abb2bf;
    font-family: 'Consolas', 'Courier New', Courier, monospace;
    font-size: 0.75rem;
    text-align: left;
    white-space: pre-wrap;
    word-wrap: break-word;
    background-color: transparent;
}
</style>
