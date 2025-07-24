<template>
  <div id="hls-player-container">
    
    <audio ref="audioPlayer" style="display: none;"></audio>

    <div class="player-content">
      <div class="station-info" :style="darkThemeTextStyle">
        <h1 class="station-name">{{ stationName }}</h1>
        <div class="curator-info" :style="[{ visibility: curatorText ? 'visible' : 'hidden' }, dynamicColorStyle]">
          {{ displayedCuratorText }}<span class="blinking-cursor" v-if="isTyping">|</span>
        </div>
      </div>

      <div class="now-playing-info" :style="darkThemeTextStyle">
        <div class="now-playing-ticker"><span>{{ nowPlaying }}</span></div>
      </div>
      <div class="controls">
        <n-button @click="togglePlay" type="primary" circle strong size="large" :disabled="isWarmingUp || isWaitingForCurator">
          <template #icon>
            <n-icon :component="playIcon" />
          </template>
        </n-button>
      </div>


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
import { useSegmentStatsStore } from '../stores/segmentStats';
import { storeToRefs } from 'pinia';
import { NButton, NIcon, useMessage } from 'naive-ui';
import PlayerPlay from '@vicons/tabler/es/PlayerPlay';
import PlayerPause from '@vicons/tabler/es/PlayerPause';
import Hls from 'hls.js';


const audioPlayer = ref(null);


let hls = null;
const isPlaying = ref(false);

const uiStore = useUiStore();
const stationStore = useStationStore();
const segmentStatsStore = useSegmentStatsStore();
const message = useMessage();
const { radioName, stationName, statusText, nowPlaying, isAsleep, isWaitingForCurator, isWarmingUp, djName, djStatus, stationColor } = storeToRefs(stationStore);


const isDebugMode = computed(() => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('debug') === '1' || urlParams.get('debug') === 'true';
});

const displayedCuratorText = ref('');
let typingTimeout = null;
let retypeInterval = null;


let audioCtx = null;
let analyser = null;
let source = null;
let animationFrameId = null;


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
    startTypingAnimation(newText);
    retypeInterval = setInterval(() => {
      startTypingAnimation(newText);
    }, 15000);
  } else {
    startTypingAnimation(null);
  }
});

watch(
  () => ({
    name: radioName.value,
    asleep: isAsleep.value,
    waiting: isWaitingForCurator.value,
  }),
  (newStatus, oldStatus) => {

    if (newStatus.asleep || newStatus.waiting) {
      if (hls) {
        console.log(`[Player] Station ${newStatus.name} is not playable. Destroying HLS instance.`);
        hls.destroy();
        hls = null;
        isPlaying.value = false;
      }
      return;
    }


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


const togglePlay = () => {
  if (isAsleep.value) {
    stationStore.wakeUpStation();
    return;
  }
  if (isWaitingForCurator.value) {
    return;
  }
  if (!audioPlayer.value) return;


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

  if (isDebugMode.value) {
    segmentStatsStore.resetStats();
  }


  hls = new Hls({
    debug: false,
    enableWorker: true,
    maxBufferLength: 30,
    maxMaxBufferLength: 600,
    fragLoadingTimeOut: 20000,
    manifestLoadingTimeOut: 10000,
    levelLoadingTimeOut: 10000,
    xhrSetup: (xhr, url) => {
      if (!isDebugMode.value) return;
      
      const startTime = performance.now();
      const segmentUrl = new URL(url);
      const segmentType = segmentUrl.pathname.endsWith('.m3u8') ? 'manifest' : 'segment';
      

      if (isDebugMode.value) {
        segmentStatsStore.addSegmentRequest({
          url: url,
          type: segmentType,
          startTime: startTime
        });
      }
      
      xhr.addEventListener('loadend', () => {
        const loadTime = performance.now() - startTime;
        const isSuccess = xhr.status >= 200 && xhr.status < 300;
        

        stationStore.trackSegmentLoad(isSuccess);
        
        if (isSuccess && isDebugMode.value) {
          segmentStatsStore.addSegmentSuccess({
            url: url,
            type: segmentType,
            startTime: startTime
          }, xhr.response);
          
          console.log(`[SEGMENT] Loaded ${segmentType}:`, {
            url: url,
            status: xhr.status,
            size: xhr.response?.length || 0,
            time: loadTime.toFixed(2) + 'ms'
          });
        }
      });
      
      xhr.addEventListener('error', (error) => {
        const segmentType = new URL(url).pathname.endsWith('.m3u8') ? 'manifest' : 'segment';
        

        if (xhr.status === 404) {
          stationStore.track404Error();
          if (isDebugMode.value) {
            console.error(`[404] Failed to load ${segmentType}: ${url.split('/').pop()}`);
          }
        }
        

        if (isDebugMode.value) {
          segmentStatsStore.addSegmentError({
            url: url,
            type: segmentType,
            startTime: performance.now()
          }, error);
          
          console.error(`[SEGMENT] Failed to load ${segmentType}:`, {
            url: url,
            status: xhr.status,
            error: error.message
          });
        }
      });
    }
  });

  hls.loadSource(streamUrl);
  hls.attachMedia(audioPlayer.value);


  window.hlsInstance = hls;

  hls.on(Hls.Events.MANIFEST_PARSED, () => {
    if (isDebugMode.value) {
      console.log('[Player] Manifest parsed, attempting to play...');
    }
    audioPlayer.value.play().catch(e => {
      if (isDebugMode.value) {
        console.error('Error on autoplay:', e);
      }
    });
  });
  
  hls.on(Hls.Events.FRAG_CHANGED, (event, data) => {
    const fragTitle = data.frag.title;
    

    if (isDebugMode && fragTitle && fragTitle !== stationStore.nowPlaying) {

    }
    
    if (fragTitle) {
      stationStore.nowPlaying = fragTitle;
    }
  });

  hls.on(Hls.Events.FRAG_BUFFERED, (event, data) => {
    if (stationStore.bufferStatus === 'stalling') {
      stationStore.setBufferStatus('ok');
    }
  });


  if (isDebugMode) {
    hls.on(Hls.Events.LEVEL_UPDATED, () => {

    });
    
    hls.on(Hls.Events.FRAG_LOADING, (event, data) => {
      if (data.frag.discontinuity) {

      }
    });
    
    hls.on(Hls.Events.FRAG_LOAD_ERROR, () => {

    });
  }

  hls.on(Hls.Events.ERROR, () => {
    if (isDebugMode) {

    }
    
    if (data.fatal) {
      console.error('HLS.js fatal error:', data);
      stationStore.setBufferStatus('fatal');

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
        
        // Set buffer status based on buffer health
        if (bufferAhead < 2) {
          stationStore.setBufferStatus('critical');
        } else if (bufferAhead < 5) {
          stationStore.setBufferStatus('poor');
        } else if (bufferAhead < 10) {
          stationStore.setBufferStatus('ok');
        } else {
          stationStore.setBufferStatus('healthy');
        }
      }
    } catch (error) {
      stationStore.setBufferStatus('fatal');
    }
  };
  
  // Check buffer health every 2 seconds
  const bufferHealthInterval = setInterval(checkBufferHealth, 2000);
  
  // Audio player event debugging for song jumping (debug mode only)
  if (isDebugMode) {
    let lastCurrentTime = 0;
    let lastTimeUpdate = Date.now();
    
    audioPlayer.value.addEventListener('seeking', () => {
      // Audio seeking event
    });
    
    audioPlayer.value.addEventListener('seeked', () => {
      // Audio seeked event
    });
    
    audioPlayer.value.addEventListener('timeupdate', () => {
      const currentTime = audioPlayer.value.currentTime;
      const now = Date.now();
      const timeDiff = Math.abs(currentTime - lastCurrentTime);
      const realTimeDiff = (now - lastTimeUpdate) / 1000;
      
      // Detect unexpected time jumps (more than 2 seconds difference from expected)
      if (realTimeDiff > 0.5 && timeDiff > realTimeDiff + 2) {
        // Unexpected time jump detected
      }
      
      lastCurrentTime = currentTime;
      lastTimeUpdate = now;
    });
    
    audioPlayer.value.addEventListener('ended', () => {
      // Audio ended event
    });
    
    audioPlayer.value.addEventListener('stalled', () => {
      // Audio stalled event
    });
    
    audioPlayer.value.addEventListener('suspend', () => {
      // Audio suspend event
    });
  }
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
    
    if (!audioCtx) {
      setupAudioVisualizer();
      window.audioContext = audioCtx;
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
  min-height: 1em; 
}

.curator-info {
  font-family: 'Goldman', sans-serif;
  font-size: 0.85rem;
  margin-top: 4px;
  min-height: 1.2em; 
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
