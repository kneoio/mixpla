<template>
  <div id="hls-player-container">
    <audio ref="audioPlayer" style="display: none;"></audio>
    <div class="controls">
      <n-button @click="togglePlay" type="primary" circle strong size="large">
        <template #icon>
          <n-icon :component="playIcon" />
        </template>
      </n-button>
    </div>

    <!-- Log console, appears when showLogs is true -->
    <div v-if="showLogs" class="log-console-wrapper">
        <pre ref="logConsoleElement" class="log-console">{{ allLogs }}</pre>
    </div>

    <!-- Subtle toggle for the log console -->
    <div class="log-toggle" @click="showLogs = !showLogs">
      {{ showLogs ? 'Hide Logs' : 'Logs' }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue';
import { NButton, NIcon, NCheckbox } from 'naive-ui';
import { PlayArrowRound, PauseRound } from '@vicons/material';
import Hls from 'hls.js';

// --- Refs and State ---
const audioPlayer = ref(null);
const logConsoleElement = ref(null); // Ref for the <pre> element
const streamUrl = 'https://bratan.online/bratan/radio/stream.m3u8';
let hls = null;
const isPlaying = ref(false);
const showLogs = ref(false);
const logs = ref([]);
const LOG_CONSOLE_HEIGHT = '200px'; // Define height for JS logic

// --- Computed Properties ---
const playIcon = computed(() => (isPlaying.value ? PauseRound : PlayArrowRound));
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
  } else {
    audioPlayer.value.pause();
  }
};

// --- Lifecycle Hooks ---
onMounted(() => {
  const audio = audioPlayer.value;
  if (!audio) return;

  audio.addEventListener('play', () => { isPlaying.value = true; });
  audio.addEventListener('pause', () => { isPlaying.value = false; });
  audio.addEventListener('ended', () => { isPlaying.value = false; });

  const addLog = (eventName, data) => {
    const logMessage = `[${new Date().toLocaleTimeString()}] ${eventName}: ${JSON.stringify(data, null, 2)}`;
    logs.value.unshift(logMessage); // Add to the beginning to show newest first at top if not scrolling
    // If you want newest at bottom and auto-scroll, consider logs.value.push(logMessage)
    // and then ensure the watcher scrolls down.
    if (logs.value.length > 100) logs.value.pop(); // Or logs.value.shift() if pushing
  };

  const tryNativePlayback = () => {
    if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      audio.src = streamUrl;
    } else {
      console.error('Native HLS playback is not supported.');
    }
  };

  if (Hls.isSupported()) {
    hls = new Hls();
    Object.values(Hls.Events).forEach(eventName => {
        hls.on(eventName, (event, data) => addLog(eventName, data));
    });
    hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal && data.details === Hls.ErrorDetails.BUFFER_ADD_CODEC_ERROR) {
        hls.destroy();
        hls = null;
        tryNativePlayback();
      }
    });
    hls.loadSource(streamUrl);
    hls.attachMedia(audio);
  } else {
    tryNativePlayback();
  }

  // Initial padding adjustment if logs are shown by default (currently not the case)
  const appContainer = document.getElementById('app-container');
  if (appContainer && showLogs.value) {
    appContainer.style.paddingBottom = LOG_CONSOLE_HEIGHT;
  }
});

onBeforeUnmount(() => {
  if (hls) hls.destroy();
  // Reset padding when component is unmounted
  const appContainer = document.getElementById('app-container');
  if (appContainer) {
    appContainer.style.paddingBottom = '0px';
  }
});
</script>

<style scoped>
.controls {
  margin-bottom: 1rem;
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
