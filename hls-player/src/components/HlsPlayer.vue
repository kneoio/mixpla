<template>
  <div id="hls-player-container">
    
    <audio ref="audioPlayer" style="display: none;"></audio>

    <div class="player-content">
      <div class="station-info" :style="darkThemeTextStyle">
        <h1 class="station-name">{{ stationName }}</h1>
        <div class="curator-info" :class="{ 'glow-once': glowOnce }" :style="[{ visibility: curatorText ? 'visible' : 'hidden' }, dynamicColorStyle]">
          {{ displayedCuratorText }}<span class="blinking-cursor" v-if="isTyping">|</span>
        </div>
      </div>

      <div class="now-playing-info" :style="darkThemeTextStyle">
        <AnimatedText 
          :text="nowPlaying" 
          :animation-type="titleAnimation.enabled ? titleAnimation.type : 'static'" 
          :animation-speed="titleAnimation.speed" 
          :station-color="complementColor"
        />
      </div>
      <div class="controls">
        <n-button @click="togglePlay" type="primary" circle strong size="large">
          <template #icon>
            <img v-if="isBuffering" :src="uiStore.theme === 'dark' ? playWaitIcon : playWaitIconWhite" alt="buffering" class="progressIcon" />
            <n-icon v-else :component="buttonIcon" class="btn-icon" />
          </template>
        </n-button>
      </div>


      <div class="station-status">
        <span>{{ displayStatusText }}</span>
      </div>
      
      <div class="station-selector-wrapper" v-if="showStations" style="margin-top: 2.5rem;">
        <n-button-group>
          <n-button v-for=" station in mainStations " :key="station.name" :type="getButtonType( station )"
            @click="handleStationClick( station )" :style="getStationStyle( station )">
            {{ formatStationName( station.name ) }}
          </n-button>
          <n-dropdown v-if=" dropdownOptions.length " trigger="click" :options="dropdownOptions"
            @select="handleDropdownSelect" placement="bottom-end">
            <n-button :type="isDropdownStationActive ? 'primary' : 'default'">...</n-button>
          </n-dropdown>
        </n-button-group>
      </div>
      
      <div class="inline-actions">
        <n-button 
          @click="shareWithFriend" 
          class="share-button"
          circle
          secondary
        >
          <template #icon>
            <n-icon><Share /></n-icon>
          </template>
        </n-button>
        <n-button 
          @click="goMixpla" 
          class="share-button"
          circle
          secondary
        >
          <template #icon>
            <n-icon><Home2 /></n-icon>
          </template>
        </n-button>
      </div>
    </div>


  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { useUiStore } from '../stores/ui';
import { useStationStore } from '../stores/station';
import { storeToRefs } from 'pinia';
import { NButton, NIcon, NSelect, NSlider, useMessage, NButtonGroup, NDropdown } from 'naive-ui';
import PlayerPlay from '@vicons/tabler/es/PlayerPlay';
import PlayerPause from '@vicons/tabler/es/PlayerPause';
import Share from '@vicons/tabler/es/Share';
import Home2 from '@vicons/tabler/es/Home2';
import Hls from 'hls.js';
import AnimatedText from './AnimatedText.vue';
import playWaitIcon from '/play_wait.svg';
import playWaitIconWhite from '/play_wait_white.svg';

const emit = defineEmits(['play-state']);

const audioPlayer = ref(null);

let hls = null;
const isPlaying = ref(false);
const userPaused = ref(false);
const userInitiatedPlay = ref(false);
const isStalled = ref(false);

const uiStore = useUiStore();
const stationStore = useStationStore();
const { radioName, radioSlug, stationName, statusText, nowPlaying, isAsleep, djName, djStatus, stationColor, titleAnimation, bufferStatus, stations } = storeToRefs(stationStore);

const urlParams = computed(() => new URLSearchParams(window.location.search));
const radioParam = computed(() => urlParams.value.get('radio'));
const requestedStations = computed(() => radioParam.value ? radioParam.value.split(',').map(s => s.trim()) : []);

const showStations = computed(() => requestedStations.value.length > 1);

const isTrace = computed(() => {
  const p = new URLSearchParams(window.location.search);
  return p.get('trace') === '1';
});

const displayStations = computed(() => {
  if (requestedStations.value.length > 0) {
    return requestedStations.value.map(stationName => {
      const existingStation = stations.value.find(s => s.name === stationName || s.slugName === stationName);
      return existingStation || {
        name: stationName,
        displayName: stationName,
        color: '#6b7280',
        currentStatus: 'UNKNOWN',
        type: 'station'
      };
    });
  }
  return [];
});

const mainStations = computed(() => displayStations.value.slice(0, 3));
const dropdownStations = computed(() => displayStations.value.slice(3));

const dropdownOptions = computed(() =>
  dropdownStations.value.map(station => ({
    label: station.displayName || formatStationName(station.name),
    key: station.name,
    props: {
      style: getStationStyle(station)
    }
  }))
);

const isDropdownStationActive = computed(() =>
  dropdownStations.value.some(s => s.name === radioName.value)
);

const getStationStyle = (station) => {
  if (station.aiControlAllowed) {
    return { color: '#FFA500' };
  }
  
  const activeStatuses = ['ONLINE', 'BROADCASTING'];
  if (activeStatuses.includes(station.currentStatus)) {
    return { color: station.color };
  }
  return {};
};

const formatStationName = (name) => {
  const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
  return capitalized.length > 6 ? `${capitalized.substring(0, 6)}...` : capitalized;
};

const getButtonType = (station) => {
  return stationStore.radioName === station.name ? 'primary' : 'default';
};

const handleStationClick = (station) => {
  stationStore.setStation(station.name);
};

const handleDropdownSelect = (key) => {
  stationStore.setStation(key);
};

 

const displayedCuratorText = ref('');
let typingTimeout = null;
let retypeInterval = null;

let audioCtx = null;
let analyser = null;
let source = null;
let animationFrameId = null;
const lastTraceTs = ref(0);
let bufferHealthInterval = null;

const isBuffering = computed(() => {
  return (isPlaying.value && ['critical', 'fatal'].includes(bufferStatus.value)) || 
         (isAsleep.value && isRetryingOffline.value);
});

const buttonIcon = computed(() => {
  return isPlaying.value ? PlayerPause : PlayerPlay;
});

const isTyping = ref(false);
const glowOnce = ref(false);
let glowTimeout = null;

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

const complementColor = computed(() => {
  const base = (stationColor.value || '#3D20E4').replace('#', '');
  const hex = base.length === 3 ? base.split('').map(c => c + c).join('') : base.substring(0, 6);
  const r = 255 - parseInt(hex.substring(0, 2), 16);
  const g = 255 - parseInt(hex.substring(2, 4), 16);
  const b = 255 - parseInt(hex.substring(4, 6), 16);
  const toHex = (n) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
});

const displayStatusText = computed(() => {
  if (isAsleep.value && isRetryingOffline.value) {
    return 'Station is offline - waiting...';
  } else if (isAsleep.value) {
    return 'Station is offline';
  }
  return statusText.value;
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

const startTypingAnimation = (text, doGlow = false) => {
  if (typingTimeout) clearTimeout(typingTimeout);
  displayedCuratorText.value = '';
  isTyping.value = false;
  if (doGlow) {
    if (glowTimeout) clearTimeout(glowTimeout);
    glowOnce.value = true;
    glowTimeout = setTimeout(() => {
      glowOnce.value = false;
    }, 1300);
  }

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
}

watch(curatorText, (newText, oldText) => {
  if (retypeInterval) clearInterval(retypeInterval);
  
  if (newText) {
    startTypingAnimation(newText, !oldText);
    retypeInterval = setInterval(() => {
      startTypingAnimation(newText, false);
    }, 30000);
  } else {
    startTypingAnimation(null, false);
  }
});

let offlineRetryInterval = null;
const isRetryingOffline = ref(false);

const startOfflineRetry = () => {
  if (offlineRetryInterval) return;
  
  isRetryingOffline.value = true;
  offlineRetryInterval = setInterval(() => {
    if (isAsleep.value && radioSlug.value) {
      if (isTrace.value) console.log('[Player] Auto-retrying offline station...');
      initializeHls(radioSlug.value);
    } else if (!isAsleep.value) {
      stopOfflineRetry();
    }
  }, 15000);
};

const stopOfflineRetry = () => {
  if (offlineRetryInterval) {
    clearInterval(offlineRetryInterval);
    offlineRetryInterval = null;
  }
  isRetryingOffline.value = false;
};

// Initialize HLS as soon as slug exists and whenever it changes.
watch(
  () => radioSlug.value,
  (newSlug, oldSlug) => {
    const slugChanged = !oldSlug || newSlug !== oldSlug;
    if (slugChanged) {
      console.log(`[Player] Station changed, slug: ${newSlug || 'empty'}`);
      
      // Always stop current audio playback when station changes
      if (audioPlayer.value) {
        audioPlayer.value.pause();
        audioPlayer.value.currentTime = 0;
        audioPlayer.value.src = '';
        audioPlayer.value.load();
      }
      
      // Destroy existing HLS instance
      if (hls) {
        try { hls.stopLoad(); } catch {}
        hls.destroy();
        hls = null;
      }
      
      userInitiatedPlay.value = false;
      userPaused.value = false;
      isPlaying.value = false;
      stopOfflineRetry();
      
      // Only initialize HLS if we have a valid slug
      if (newSlug) {
        initializeHls(newSlug);
      }
    }
  },
  { immediate: true }
);

const togglePlay = () => {
  if (!audioPlayer.value) return;

  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  if (audioPlayer.value.paused) {
    userPaused.value = false;
    userInitiatedPlay.value = true;
    if (!hls && radioSlug.value) {
      initializeHls(radioSlug.value);
    }
    
    if (isAsleep.value && radioSlug.value) {
      if (isRetryingOffline.value) {
        stopOfflineRetry();
        if (isTrace.value) console.log('[Player] Stopped offline retry');
      } else {
        if (isTrace.value) console.log('[Player] Starting offline retry...');
        initializeHls(radioSlug.value);
        startOfflineRetry();
      }
    } else {
      if (hls) {
        hls.startLoad();
      }
      audioPlayer.value.play().catch(e => console.error('Play error:', e));
    }
  } else {
    userPaused.value = true;
    audioPlayer.value.pause();
    if (hls) {
      hls.stopLoad();
    }
    stopOfflineRetry();
  }
};

let recoveryAttempts = 0;
const MAX_RECOVERY_ATTEMPTS = 3;
let recoveryTimeout = null;

const resetRecoveryState = () => {
  recoveryAttempts = 0;
  if (recoveryTimeout) {
    clearTimeout(recoveryTimeout);
    recoveryTimeout = null;
  }
};

const attemptRecovery = (hlsInstance, errorType = 'unknown') => {
  if (recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
    console.error(`[HLS] Max recovery attempts (${MAX_RECOVERY_ATTEMPTS}) reached for error:`, errorType);
    resetRecoveryState();
    return false;
  }

  recoveryAttempts++;
  console.log(`[HLS] Recovery attempt ${recoveryAttempts}/${MAX_RECOVERY_ATTEMPTS} for ${errorType}`);
  
  const delay = 1000;
  
  recoveryTimeout = setTimeout(() => {
    if (hlsInstance) {
      hlsInstance.startLoad();
    }
  }, delay);
  
  return true;
};

function initializeHls(slug) {
  resetRecoveryState();
  
  if (hls) {
    try { hls.stopLoad(); } catch {}
    hls.destroy();
    hls = null;
  }
  
  // Ensure audio is completely stopped
  if (audioPlayer.value) {
    audioPlayer.value.pause();
    audioPlayer.value.currentTime = 0;
    audioPlayer.value.src = '';
    audioPlayer.value.load();
  }
  if (!Hls.isSupported()) {
    console.error("HLS is not supported in this browser.");
    return;
  }

  const cacheBuster = Date.now();
  const streamUrl = `${import.meta.env.VITE_STREAM_BASE_URL}/${slug}/radio/stream.m3u8?cb=${cacheBuster}`;

  hls = new Hls({
    debug: false,
    enableWorker: true,
    maxBufferLength: 30,
    maxMaxBufferLength: 600,
    backBufferLength: 0,
    liveSyncDuration: 3,
    liveMaxLatencyDuration: 10,
    fragLoadingTimeOut: 20000,
    manifestLoadingTimeOut: 10000,
    levelLoadingTimeOut: 10000
  });

  hls.loadSource(streamUrl);
  hls.attachMedia(audioPlayer.value);


  window.hlsInstance = hls;

  hls.on(Hls.Events.MANIFEST_PARSED, () => {
    if (!isStalled.value && userInitiatedPlay.value) {
      audioPlayer.value.play().catch(e => {
        
      });
    }
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
    
    stationStore.trackSegmentLoad(true);
    
    const ahead = bufferAheadSeconds();
    if (ahead >= 3) {
      isStalled.value = false;
    }

    if (isTrace.value) {
      const now = performance.now();
      if (now - lastTraceTs.value > 5000) {
        try {
          const t = data && data.frag && (data.frag.title || data.frag.sn || '');
          console.log('[trace] FRAG_BUFFERED', t);
        } catch {}
        lastTraceTs.value = now;
      }
    }

    if (hls && hls.media && hls.media.paused && !userPaused.value && !isStalled.value && ahead >= 3) {
      hls.media.play().catch(e => {
        console.error('Failed to resume playback after buffering:', e);
      });
    }
  });

 

  hls.on(Hls.Events.ERROR, (event, data) => {
    if (data.fatal) {
      console.error('HLS.js fatal error:', data);
      stationStore.setBufferStatus('fatal');
      
      const errorType = data.type === Hls.ErrorTypes.NETWORK_ERROR ? 'network' : 
                      data.type === Hls.ErrorTypes.MEDIA_ERROR ? 'media' : 'fatal';

      if (!attemptRecovery(hls, errorType)) {
        console.error(`[HLS] Recovery failed for ${errorType} error, triggering full reload`);
        if (hls) hls.destroy();
        initializeHls(slug);
      } else {        
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          console.error("Network error, attempting recovery...");
          hls.startLoad();
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          console.error("Media error, attempting recovery...");
          hls.recoverMediaError();
        }
      }
    }
  });

  hls.on(Hls.Events.FRAG_LOAD_ERROR, (event, data) => {
    stationStore.trackSegmentLoad(false);
    
    if (hls && hls.media) {
      
    }
  });

  hls.on(Hls.Events.BUFFER_STALLED, (event, data) => {
    stationStore.setBufferStatus('stalling');
    isStalled.value = true;
  });


  const checkBufferHealth = () => {
    if (!audioPlayer.value || !hls) return;
    
    try {
      const buffered = audioPlayer.value.buffered;
      const currentTime = audioPlayer.value.currentTime;
      
      if (buffered.length > 0) {

        let bufferAhead = 0;
        for (let i = 0; i < buffered.length; i++) {
          if (buffered.start(i) <= currentTime && currentTime <= buffered.end(i)) {
            bufferAhead = buffered.end(i) - currentTime;
          }
        }
        
        if (bufferAhead < 0.5) {
          stationStore.setBufferStatus('critical');
        } else if (bufferAhead < 2) {
          stationStore.setBufferStatus('poor');
        } else if (bufferAhead < 5) {
          stationStore.setBufferStatus('ok');
        } else {
          stationStore.setBufferStatus('healthy');
        }
      }
    } catch (error) {
      stationStore.setBufferStatus('fatal');
    }
  };

  function bufferAheadSeconds() {
    if (!audioPlayer.value) return 0;
    const el = audioPlayer.value;
    const t = el.currentTime;
    const ranges = el.buffered;
    let ahead = 0;
    for (let i = 0; i < ranges.length; i++) {
      if (ranges.start(i) <= t && t <= ranges.end(i)) {
        ahead = Math.max(ahead, ranges.end(i) - t);
      }
    }
    return ahead;
  }
  

  if (bufferHealthInterval) {
    clearInterval(bufferHealthInterval);
    bufferHealthInterval = null;
  }
  bufferHealthInterval = setInterval(checkBufferHealth, 10000);
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

  // Expose references globally for diagnostics
  window.hlsInstance = null;
  window.audioContext = null;
  window.audioElement = audio;

  const onPlay = () => {
    isPlaying.value = true;
    emit('play-state', { playing: true });
    
    if (!audioCtx) {
      setupAudioVisualizer();
      window.audioContext = audioCtx;
    }
    
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    renderFrame();
  };
  
  audio.addEventListener('loadedmetadata', () => {
    if (!audioPlayer.value) return;
    audioPlayer.value.playbackRate = 1.0;
  });
  
  audio.addEventListener('timeupdate', () => {
    // Time update handler
  });
  
  audio.addEventListener('playing', onPlay);

  const onPauseOrEnd = () => {
    isPlaying.value = false;
    emit('play-state', { playing: false });
    // Stop the animation loop.
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    stationStore.animationIntensity = 0;
  };

  audio.addEventListener('play', onPlay);
  audio.addEventListener('pause', onPauseOrEnd);
  audio.addEventListener('ended', onPauseOrEnd);
});

const shareWithFriend = async () => {
  const currentRadio = (radioSlug && radioSlug.value) || (radioName && radioName.value) || 'aizoo';
  const shareUrl = `${window.location.origin}/?radio=${currentRadio}`;
  const titleText = `Listen to ${stationName && stationName.value ? stationName.value : currentRadio}`;
  const bodyText = `Check out this radio station: ${stationName && stationName.value ? stationName.value : currentRadio}`;
  try {
    if (navigator.share) {
      await navigator.share({
        title: titleText,
        text: bodyText,
        url: shareUrl
      });
    } else {
      await navigator.clipboard.writeText(shareUrl);
    }
  } catch (error) {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {}
  }
};

const goMixpla = () => {
  window.location.href = 'https://mixpla.io';
};

onBeforeUnmount(() => {
  if (hls) {
    try { hls.stopLoad(); } catch {}
    hls.destroy();
  }
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  if (typingTimeout) clearTimeout(typingTimeout);
  if (retypeInterval) clearInterval(retypeInterval);
  if (glowTimeout) clearTimeout(glowTimeout);
  if (bufferHealthInterval) {
    clearInterval(bufferHealthInterval);
    bufferHealthInterval = null;
  }
  stopOfflineRetry();
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
  width: 100%;
}

.now-playing-info {
  text-align: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 120px;
  min-height: 120px;
  width: 100%;
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
  margin-top: 2rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.station-status {
  font-size: 0.75rem;
  color: #aaa;
  min-height: 1em; 
}

.share-button {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  color: #888 !important;
  transition: all 0.3s ease;
}

.share-button:hover {
  background: transparent !important;
  transform: translateY(-1px);
  box-shadow: none !important;
}

.inline-actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.curator-info {
  font-family: 'Goldman', sans-serif;
  font-size: 0.85rem;
  margin-top: 4px;
  min-height: 1.2em; 
}

.glow-once {
  animation: curatorGlowPulse 1.2s cubic-bezier(0.4, 0, 0.2, 1) 1;
  will-change: text-shadow, filter;
}

@keyframes curatorGlowPulse {
  0% {
    text-shadow:
      0 0 3px currentColor,
      0 0 6px currentColor,
      0 0 9px currentColor;
    filter: brightness(1);
  }
  50% {
    text-shadow:
      0 0 10px currentColor,
      0 0 20px currentColor,
      0 0 30px currentColor;
    filter: brightness(1.12);
  }
  100% {
    text-shadow:
      0 0 3px currentColor,
      0 0 6px currentColor,
      0 0 9px currentColor;
    filter: brightness(1);
  }
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

.progressIcon {
  width: 32px;
  height: 32px;
  display: inline-block;
}


 





</style>
