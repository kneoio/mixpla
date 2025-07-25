<template>
  <div class="diagnostics-terminal">
    <div class="terminal-header">
      <span>AUDIO DIAGNOSTICS</span>
      <div class="terminal-controls">
        <n-button @click="testPlaybackSpeed" :disabled="isTestingSpeed" size="small" type="primary">
          {{ isTestingSpeed ? 'Testing...' : 'Speed Test' }}
        </n-button>
        <n-button @click="logAudioMetadata" size="small" type="tertiary">Log Metadata</n-button>
        <n-button @click="resetPlaybackRate" size="small" type="tertiary">Reset Rate</n-button>
        <n-button @click="copyDiagnosticInfo" size="small" type="tertiary">Copy</n-button>
        <n-button @click="saveSnapshot" size="small" type="tertiary">Save Snapshot</n-button>
        <n-button @click="clearLogs" size="small" type="tertiary">Clear</n-button>
      </div>
    </div>
    
    <div class="terminal-content">
      <div class="info-line">Now Playing: {{ nowPlaying || '' }} | Station: {{ stationName || '' }}</div>
      <div class="info-line">Rate: {{ audioProperties.playbackRate }} | Duration: {{ formatTime(audioProperties.duration) }} | Time: {{ formatTime(audioProperties.currentTime) }}</div>
      <div class="info-line">Sample Rate: {{ audioContext?.sampleRate || '' }}Hz | State: {{ audioContext?.state || '' }} | Buffer: {{ getBufferHealth() }}</div>
      <div class="info-line">Bitrate: {{ hlsProperties.bitrate || '' }}kbps | Codec: {{ hlsProperties.codec || '' }} | Level: {{ hlsProperties.currentLevel }}</div>
      <div class="info-line">Segments: {{ segmentStats.successfulSegments }}/{{ segmentStats.totalSegments }} ({{ segmentStats.successRate }}%) | Errors: {{ segmentStats.failedSegments }} ({{ segmentStats.errorRate }}%) | Avg Load: {{ segmentStats.averageLoadTime }}ms</div>
      <div v-if="speedTestResult" class="info-line speed-result">{{ speedTestResult }}</div>
      
      <n-collapse class="log-section" :default-expanded-names="['logs']">
        <n-collapse-item title="Segment Errors ({{ segmentStats.segmentErrors.length }})" name="errors" v-if="segmentStats.segmentErrors.length > 0">
          <n-data-table
            :columns="errorColumns"
            :data="segmentStats.segmentErrors"
            :pagination="{ pageSize: 3 }"
            size="small"
            :single-line="false"
            class="error-table"
          />
        </n-collapse-item>
        
        <n-collapse-item title="Logs" name="logs" default-expanded>
          <div v-for="(log, index) in diagnosticLogs.slice(0, 8)" :key="index" class="log-line">
            [{{ log.time }}] {{ log.message }}
          </div>
        </n-collapse-item>
      </n-collapse>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useStationStore } from '../stores/station';
import { useSegmentStatsStore } from '../stores/segmentStats';
import { storeToRefs } from 'pinia';
import { NButton, NCollapse, NCollapseItem, NDataTable } from 'naive-ui';


const stationStore = useStationStore();
const segmentStatsStore = useSegmentStatsStore();
const { stationName, nowPlaying } = storeToRefs(stationStore);

// Segment error table columns
const errorColumns = [
  {
    title: 'Time',
    key: 'time',
    render: (row) => new Date(row.time).toLocaleTimeString()
  },
  {
    title: 'Error',
    key: 'error',
    ellipsis: {
      tooltip: true
    }
  },
  {
    title: 'URL',
    key: 'url',
    render: (row) => {
      const url = new URL(row.url);
      return url.pathname.split('/').pop();
    },
    ellipsis: {
      tooltip: true
    }
  },
  {
    title: 'Status',
    key: 'status',
    render: (row) => row.status || 'N/A'
  }
];

const segmentStats = computed(() => {
  const stats = {
    totalSegments: segmentStatsStore.totalSegments,
    successfulSegments: segmentStatsStore.successfulSegments,
    failedSegments: segmentStatsStore.failedSegments,
    successRate: segmentStatsStore.successRate,
    errorRate: segmentStatsStore.errorRate,
    averageLoadTime: segmentStatsStore.averageLoadTime,
    segmentErrors: [...segmentStatsStore.segmentErrors]
  };
  return stats;
});

const audioProperties = ref({
  playbackRate: 1,
  duration: 0,
  currentTime: 0,
  channels: null,
  paused: true
});

const hlsProperties = ref({
  currentLevel: -1,
  levels: [],
  bitrate: null,
  codec: null,
  fragDuration: 0,
  bufferLength: 0,
  droppedFrames: 0
});

const audioContext = ref(null);
const diagnosticLogs = ref([]);
const isTestingSpeed = ref(false);
const speedTestResult = ref('');

let audioPlayer = null;
let hls = null;
let updateInterval = null;

const addLog = (message) => {
  const now = new Date();
  diagnosticLogs.value.unshift({
    time: now.toLocaleTimeString(),
    message
  });
  if (diagnosticLogs.value.length > 50) {
    diagnosticLogs.value = diagnosticLogs.value.slice(0, 50);
  }
};

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getBufferHealth = () => {
  if (!audioPlayer) return '';
  try {
    const buffered = audioPlayer.buffered;
    if (buffered.length === 0) return 'Empty';
    
    const currentTime = audioPlayer.currentTime;
    const bufferEnd = buffered.end(buffered.length - 1);
    const bufferAhead = bufferEnd - currentTime;
    
    if (bufferAhead > 10) return 'Excellent';
    if (bufferAhead > 5) return 'Good';
    if (bufferAhead > 2) return 'Fair';
    return 'Low';
  } catch (e) {
    return 'Error';
  }
};

const updateAudioProperties = () => {
  if (!audioPlayer) return;
  
  audioProperties.value = {
    playbackRate: audioPlayer.playbackRate,
    duration: audioPlayer.duration,
    currentTime: audioPlayer.currentTime,
    channels: audioPlayer.mozChannels || audioPlayer.webkitAudioDecodedByteCount || null,
    paused: audioPlayer.paused
  };
};

const updateHlsProperties = () => {
  if (!hls) return;
  
  try {
    const levels = hls.levels || [];
    const currentLevel = hls.currentLevel;
    const stats = hls.stats;
    
    hlsProperties.value = {
      currentLevel,
      levels: levels.map(level => ({
        bitrate: level.bitrate,
        width: level.width,
        height: level.height,
        codec: level.videoCodec || level.audioCodec
      })),
      bitrate: currentLevel >= 0 && levels[currentLevel] ? levels[currentLevel].bitrate : null,
      codec: currentLevel >= 0 && levels[currentLevel] ? 
        (levels[currentLevel].audioCodec || levels[currentLevel].videoCodec) : null,
      fragDuration: stats.fragLoadingTime || 0,
      bufferLength: stats.bufferLength || 0,
      droppedFrames: stats.droppedFrames || 0
    };
  } catch (e) {
    addLog(`Error updating HLS properties: ${e.message}`);
  }
};

const testPlaybackSpeed = async () => {
  if (!audioPlayer) {
    speedTestResult.value = 'No audio player found';
    return;
  }
  
  isTestingSpeed.value = true;
  addLog('Starting playback speed test...');
  
  try {
    const startTime = audioPlayer.currentTime;
    const startTimestamp = Date.now();
    
    // Wait 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const endTime = audioPlayer.currentTime;
    const endTimestamp = Date.now();
    
    const actualElapsed = endTime - startTime;
    const expectedElapsed = (endTimestamp - startTimestamp) / 1000;
    const speedRatio = actualElapsed / expectedElapsed;
    
    speedTestResult.value = `Speed ratio: ${speedRatio.toFixed(3)} (${(speedRatio * 100).toFixed(1)}%)`;
    addLog(`Speed test completed: ${speedTestResult.value}`);
    
    if (speedRatio < 0.95) {
      addLog('⚠️ Playback appears to be slower than normal');
    } else if (speedRatio > 1.05) {
      addLog('⚠️ Playback appears to be faster than normal');
    } else {
      addLog('✅ Playback speed appears normal');
    }
  } catch (e) {
    speedTestResult.value = `Test failed: ${e.message}`;
    addLog(`Speed test error: ${e.message}`);
  } finally {
    isTestingSpeed.value = false;
  }
};

const logAudioMetadata = () => {
  addLog('=== AUDIO METADATA ===');
  addLog(`Now Playing: ${nowPlaying.value}`);
  addLog(`Playback Rate: ${audioPlayer?.playbackRate || ''}`);
  addLog(`Sample Rate: ${audioContext.value?.sampleRate || ''} Hz`);
  addLog(`Audio Context State: ${audioContext.value?.state || ''}`);
  addLog(`Current HLS Level: ${hlsProperties.value.currentLevel}`);
  addLog(`Bitrate: ${hlsProperties.value.bitrate || ''} kbps`);
  addLog(`Codec: ${hlsProperties.value.codec || ''}`);
  
  if (audioPlayer) {
    addLog(`Audio Duration: ${formatTime(audioPlayer.duration)}`);
    addLog(`Audio Current Time: ${formatTime(audioPlayer.currentTime)}`);
    addLog(`Audio Paused: ${audioPlayer.paused}`);
    addLog(`Audio Volume: ${audioPlayer.volume}`);
    addLog(`Audio Muted: ${audioPlayer.muted}`);
  }
  
  addLog('=== END METADATA ===');
};

const resetPlaybackRate = () => {
  if (audioPlayer) {
    audioPlayer.playbackRate = 1.0;
    addLog('Reset playback rate to 1.0');
  }
};

const clearLogs = () => {
  diagnosticLogs.value = [];
};

const saveSnapshot = () => {
  const info = {
    metadata: {
      timestamp: new Date().toISOString(),
      nowPlaying: nowPlaying.value,
      station: stationName.value,
      snapshotVersion: '1.0'
    },
    audioProperties: {
      playbackRate: audioProperties.value.playbackRate,
      duration: audioProperties.value.duration,
      currentTime: audioProperties.value.currentTime,
      channels: audioProperties.value.channels,
      paused: audioProperties.value.paused
    },
    audioContext: {
      sampleRate: audioContext.value?.sampleRate || null,
      state: audioContext.value?.state || null
    },
    hlsProperties: {
      currentLevel: hlsProperties.value.currentLevel,
      availableLevels: hlsProperties.value.levels.length,
      levels: hlsProperties.value.levels,
      bitrate: hlsProperties.value.bitrate,
      codec: hlsProperties.value.codec,
      fragmentDuration: hlsProperties.value.fragDuration,
      bufferLength: hlsProperties.value.bufferLength,
      droppedFrames: hlsProperties.value.droppedFrames
    },
    performance: {
      bufferHealth: getBufferHealth(),
      speedTestResult: speedTestResult.value,
      segmentStats: {
        totalSegments: segmentStatsStore.totalSegments,
        successfulSegments: segmentStatsStore.successfulSegments,
        failedSegments: segmentStatsStore.failedSegments,
        successRate: segmentStatsStore.successRate,
        errorRate: segmentStatsStore.errorRate,
        averageLoadTime: segmentStatsStore.averageLoadTime,
        lastError: segmentStatsStore.lastError,
        lastErrorTime: segmentStatsStore.lastErrorTime,
        lastSegment: {
          url: segmentStatsStore.lastSegmentUrl,
          time: segmentStatsStore.lastSegmentTime,
          size: segmentStatsStore.lastSegmentSize,
          type: segmentStatsStore.lastSegmentType
        },
        recentErrors: [...segmentStatsStore.segmentErrors]
      }
    },
    logs: diagnosticLogs.value.slice(0, 10).map(log => ({
      time: log.time,
      message: log.message
    }))
  };
  
  const songName = (nowPlaying.value || 'unknown-song').replace(/[^a-zA-Z0-9-_]/g, '-');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${songName}-${timestamp}.json`;
  
  const jsonData = JSON.stringify(info, null, 2);
  const blob = new Blob([jsonData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  addLog(`✅ Snapshot saved as ${filename}`);
};

const copyDiagnosticInfo = async () => {
  const info = {
    timestamp: new Date().toISOString(),
    nowPlaying: nowPlaying.value,
    station: stationName.value,
    audioProperties: audioProperties.value,
    hlsProperties: hlsProperties.value,
    audioContext: {
      sampleRate: audioContext.value?.sampleRate || 'N/A',
      state: audioContext.value?.state || 'N/A'
    },
    speedTestResult: speedTestResult.value,
    bufferHealth: getBufferHealth(),
    recentLogs: diagnosticLogs.value.slice(0, 10)
  };
  
  const formattedInfo = `=== MIXPLA AUDIO DIAGNOSTICS ===
Timestamp: ${info.timestamp}
Now Playing: ${info.nowPlaying || 'N/A'}
Station: ${info.station || 'N/A'}

--- AUDIO PROPERTIES ---
Playback Rate: ${info.audioProperties.playbackRate}
Duration: ${formatTime(info.audioProperties.duration)}
Current Time: ${formatTime(info.audioProperties.currentTime)}
Channels: ${info.audioProperties.channels || 'Unknown'}
Paused: ${info.audioProperties.paused}

--- AUDIO CONTEXT ---
Sample Rate: ${info.audioContext.sampleRate} Hz
State: ${info.audioContext.state}

--- HLS PROPERTIES ---
Current Level: ${info.hlsProperties.currentLevel}
Available Levels: ${info.hlsProperties.levels.length}
Bitrate: ${info.hlsProperties.bitrate || 'Unknown'} kbps
Codec: ${info.hlsProperties.codec || 'Unknown'}
Fragment Duration: ${info.hlsProperties.fragDuration}s
Buffer Length: ${info.hlsProperties.bufferLength}s
Dropped Frames: ${info.hlsProperties.droppedFrames}

--- PERFORMANCE ---
Buffer Health: ${info.bufferHealth}
Speed Test Result: ${info.speedTestResult || 'Not tested'}

--- RECENT LOGS ---
${info.recentLogs.map(log => `[${log.time}] ${log.message}`).join('\n')}

=== END DIAGNOSTICS ===`;
  
  try {
    await navigator.clipboard.writeText(formattedInfo);
    addLog('✅ Diagnostic info copied to clipboard');
  } catch (err) {
    addLog('❌ Failed to copy to clipboard');
    console.error('Copy failed:', err);
  }
};

onMounted(() => {
  const findAudioElements = () => {
    const audioEl = document.querySelector('audio');
    if (audioEl) {
      audioPlayer = audioEl;
      addLog('Found audio element');
    }
    
    if (window.hlsInstance) {
      hls = window.hlsInstance;
      addLog('Found HLS instance');
    }
    
    if (window.audioContext) {
      audioContext.value = window.audioContext;
      addLog('Found AudioContext');
    }
  };
  
  findAudioElements();
  
  updateInterval = setInterval(() => {
    updateAudioProperties();
    updateHlsProperties();
  }, 1000);
  
  addLog('Audio diagnostics initialized');
});

onBeforeUnmount(() => {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
});
</script>

<style scoped>
.diagnostics-terminal {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 200px;
  background: #000;
  color: #fff;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  border-top: 1px solid #333;
  z-index: 1000;
}

.terminal-header {
  background: #222;
  padding: 5px 10px;
  border-bottom: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  color: #fff;
}

.terminal-controls {
  display: flex;
  gap: 5px;
}

.terminal-controls .n-button {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace !important;
}

.terminal-content {
  padding: 10px;
  height: calc(100% - 40px);
  overflow-y: auto;
  text-align: left;
}

.info-line {
  margin: 2px 0;
  font-size: 12px;
  text-align: left;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  color: #fff;
  font-weight: normal;
}

.speed-result {
  font-weight: bold;
  color: #ff0;
}

.log-section {
  margin-top: 10px;
  border-top: 1px solid #333;
  padding-top: 5px;
}

.log-line {
  font-size: 11px;
  color: #ddd;
  margin: 1px 0;
  text-align: left;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}
</style>
