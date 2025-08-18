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
        <AnimatedText 
          :text="nowPlaying" 
          :animation-type="titleAnimation.enabled ? titleAnimation.type : 'static'" 
          :animation-speed="titleAnimation.speed" 
        />
      </div>
      <div class="controls">
        <n-button @click="togglePlay" type="primary" circle strong size="large">
          <template #icon>
            <n-icon :component="buttonIcon" class="btn-icon" />
          </template>
        </n-button>
      </div>


      <div class="station-status">
        <span>{{ statusText }}</span>
      </div>
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
    </div>


  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { useUiStore } from '../stores/ui';
import { useStationStore } from '../stores/station';
import { useSegmentStatsStore } from '../stores/segmentStats';
import { storeToRefs } from 'pinia';
import { NButton, NIcon, NSelect, NSlider, useMessage } from 'naive-ui';
import PlayerPlay from '@vicons/tabler/es/PlayerPlay';
import PlayerPause from '@vicons/tabler/es/PlayerPause';
import Loader from '@vicons/tabler/es/Loader';
import Share from '@vicons/tabler/es/Share';
import Hls from 'hls.js';
import AnimatedText from './AnimatedText.vue';

const audioPlayer = ref(null);

let hls = null;
const isPlaying = ref(false);
const userPaused = ref(false);
const userInitiatedPlay = ref(false);

const uiStore = useUiStore();
const stationStore = useStationStore();
const segmentStatsStore = useSegmentStatsStore();
const { radioName, radioSlug, stationName, statusText, nowPlaying, isAsleep, isWarmingUp, djName, djStatus, stationColor, titleAnimation } = storeToRefs(stationStore);

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

const buttonIcon = computed(() => {
  if (isWarmingUp.value) {
    if (isPlaying.value && userInitiatedPlay.value) return PlayerPause;
    return Loader;
  }
  return isPlaying.value ? PlayerPause : PlayerPlay;
});

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

// Initialize HLS as soon as slug exists and whenever it changes.
watch(
  () => radioSlug.value,
  (newSlug, oldSlug) => {
    if (!newSlug) return;
    const slugChanged = !oldSlug || newSlug !== oldSlug;
    if (slugChanged) {
      console.log(`[Player] Initializing HLS for slug: ${newSlug}`);
      userInitiatedPlay.value = false;
      initializeHls(newSlug);
    }
  },
  { immediate: true }
);

const togglePlay = () => {
  if (isAsleep.value || isWarmingUp.value) {
    stationStore.wakeUpStation();
  }

  if (!audioPlayer.value) return;

  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  if (audioPlayer.value.paused) {
    userPaused.value = false;
    userInitiatedPlay.value = true;
    audioPlayer.value.play().catch(e => console.error('Play error:', e));
  } else {
    userPaused.value = true;
    audioPlayer.value.pause();
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
  
  // Exponential backoff: 500ms, 1000ms, 2000ms
  const delay = Math.min(500 * Math.pow(2, recoveryAttempts - 1), 5000);
  
  recoveryTimeout = setTimeout(() => {
    if (hlsInstance) {
      hlsInstance.startLoad();
    }
  }, delay);
  
  return true;
};

const initializeHls = (radioSlug) => {
  resetRecoveryState();
  
  if (hls) {
    hls.destroy();
  }
  if (!Hls.isSupported()) {
    console.error("HLS is not supported in this browser.");
    return;
  }


  const streamUrl = `${import.meta.env.VITE_STREAM_BASE_URL}/${radioSlug}/radio/stream.m3u8`;

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
          
          /*console.log(`[SEGMENT] Loaded ${segmentType}:`, {
            url: url,
            status: xhr.status,
            size: xhr.response?.length || 0,
            time: loadTime.toFixed(2) + 'ms'
          });*/
        }
      });
      
      xhr.addEventListener('error', (error) => {
        const segmentType = new URL(url).pathname.endsWith('.m3u8') ? 'manifest' : 'segment';
        const errorType = xhr.status === 404 ? '404' : 'network_error';
        
        if (xhr.status === 404) {
          stationStore.track404Error();
        }
        
        if (isDebugMode.value) {
          console.error(`[${errorType}] Failed to load ${segmentType}: ${url.split('/').pop()}`);
          
          segmentStatsStore.addSegmentError({
            url: url,
            type: segmentType,
            startTime: performance.now(),
            status: xhr.status,
            error: error.message,
            recoveryAttempt: recoveryAttempts + 1,
            timestamp: new Date().toISOString()
          }, error);
          
          console.error(`[SEGMENT] Failed to load ${segmentType}:`, {
            url: url,
            status: xhr.status,
            error: error.message,
            recoveryAttempt: recoveryAttempts + 1,
            timestamp: new Date().toISOString()
          });
        }
                
        if (hls && !attemptRecovery(hls, errorType)) {
          console.error('[HLS] Recovery failed, triggering full reload');
          if (hls) hls.destroy();
          initializeHls(radioSlug.value);
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
    if (!isWarmingUp.value || userInitiatedPlay.value) {
      audioPlayer.value.play().catch(e => {
        if (isDebugMode.value) {
          console.error('Error on autoplay:', e);
        }
      });
    }
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
    if (isDebugMode) {
      console.log('[FRAG_BUFFERED] Fragment buffered:', data.frag);
    }
    
    if (stationStore.bufferStatus === 'stalling') {
      stationStore.setBufferStatus('ok');
    }
    
    stationStore.trackSegmentLoad(true);
    
    if (hls && hls.media && hls.media.paused && !userPaused.value && (!isWarmingUp.value || userInitiatedPlay.value)) {
      console.log('Media is paused (not by user), attempting to play...');
      hls.media.play().catch(e => {
        console.error('Failed to resume playback after buffering:', e);
      });
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

  hls.on(Hls.Events.ERROR, (event, data) => {
    if (isDebugMode.value) {
      console.error('[HLS ERROR]', data);
    }
    
    if (data.fatal) {
      console.error('HLS.js fatal error:', data);
      stationStore.setBufferStatus('fatal');
      
      const errorType = data.type === Hls.ErrorTypes.NETWORK_ERROR ? 'network' : 
                      data.type === Hls.ErrorTypes.MEDIA_ERROR ? 'media' : 'fatal';

      if (!attemptRecovery(hls, errorType)) {
        console.error(`[HLS] Recovery failed for ${errorType} error, triggering full reload`);
        if (hls) hls.destroy();
        initializeHls(radioSlug.value);
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
    if (isDebugMode) {
      console.error('[FRAG_LOAD_ERROR] Failed to load fragment:', {
        frag: data.frag,
        response: data.response,
        error: data.error
      });
    }
    
    stationStore.trackSegmentLoad(false);
    
    if (hls && hls.media) {
      console.log('Current buffer state:', {
        buffered: hls.media.buffered.length > 0 ? hls.media.buffered : 'empty',
        currentTime: hls.media.currentTime,
        readyState: hls.media.readyState,
        networkState: hls.media.networkState
      });
      
      if (hls.media.buffered.length > 0) {
        console.log('Buffer ranges:');
        for (let i = 0; i < hls.media.buffered.length; i++) {
          console.log(`  ${i}: ${hls.media.buffered.start(i)} -> ${hls.media.buffered.end(i)}`);
        }
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
  

  const bufferHealthInterval = setInterval(checkBufferHealth, 2000);
  
  if (isDebugMode) {
    let lastCurrentTime = 0;
    let lastTimeUpdate = Date.now();
    
    audioPlayer.value.addEventListener('seeking', () => {
    });
    
    audioPlayer.value.addEventListener('seeked', () => {
    });
    
    audioPlayer.value.addEventListener('timeupdate', () => {
      const currentTime = audioPlayer.value.currentTime;
      const now = Date.now();
      const timeDiff = Math.abs(currentTime - lastCurrentTime);
      const realTimeDiff = (now - lastTimeUpdate) / 1000;
      
    
      if (realTimeDiff > 0.5 && timeDiff > realTimeDiff + 2) {
    
      }
      
      lastCurrentTime = currentTime;
      lastTimeUpdate = now;
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

const shareWithFriend = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const radioName = urlParams.get('radio') || 'aizoo';
  const shareUrl = `https://mixpla.kneo.io/?radio=${radioName}`;
  
  try {
    if (navigator.share) {
      await navigator.share({
        title: `Listen to ${stationStore.stationName || radioName}`,
        text: `Check out this radio station: ${stationStore.stationName || radioName}`,
        url: shareUrl
      });
    } else {
      await navigator.clipboard.writeText(shareUrl);
    }
  } catch (error) {
    console.error('Error sharing:', error);
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch (clipboardError) {
      console.error('Unable to share or copy link');
    }
  }
};

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

.share-button {
  margin-top: 10px;
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
