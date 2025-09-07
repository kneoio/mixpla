<template>
  <div id="app-container" :style="[dynamicBorderStyle, pulsingBorderStyle]">
    <div class="status-indicator-wrapper-top-left">
      <div :class="['buffer-indicator', indicatorClass]"></div>
    </div>
    <div class="theme-switch-wrapper" v-if="isPaused">
      <n-switch size="medium" :value="uiStore.theme === 'dark'" @update:value="uiStore.toggleTheme" :round="false" />
      <span>Theme</span>
      <n-switch size="medium" :value="!uiStore.disableAnimations" @update:value="uiStore.toggleAnimationsDisabled" :round="false" />
      <span>Animation</span>
    </div>
    <HlsPlayer @play-state="onPlayState" />
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, computed, watch, ref } from 'vue';
import { NSwitch } from 'naive-ui';
import HlsPlayer from '../components/HlsPlayer.vue';
import './Home.css';
import { useUiStore } from '../stores/ui';
import { useStationStore } from '../stores/station';
import { storeToRefs } from 'pinia';

const uiStore = useUiStore();
const stationStore = useStationStore();

const isPaused = ref(true);
const onPlayState = (e) => {
  isPaused.value = !e.playing;
};


const {
  stations,
  radioName,
  isAsleep,

  
  bufferStatus,
  dynamicBorderStyle: storeDynamicBorderStyle,
  isBroadcasting,
  isWaitingForCurator,
  animationIntensity,
  stationColor
} = storeToRefs( stationStore );

onMounted(async () => {
  await stationStore.fetchStations(false);
} );

const idleIntensity = ref(0);
let idleAnimId = null;
const startIdlePulse = () => {
  const tick = (ts) => {
    const t = ts / 1000;
    idleIntensity.value = 0.1 + 0.15 * Math.sin(t * Math.PI);
    idleAnimId = requestAnimationFrame(tick);
  };
  idleAnimId = requestAnimationFrame(tick);
};
onMounted(() => {
  startIdlePulse();
});
onBeforeUnmount(() => {
  if (idleAnimId) cancelAnimationFrame(idleAnimId);
  idleAnimId = null;
});

const urlParams = computed(() => new URLSearchParams(window.location.search));
const radioParam = computed(() => urlParams.value.get('radio'));
const requestedStations = computed(() => radioParam.value ? radioParam.value.split(',').map(s => s.trim()) : []);

const showStations = computed(() => requestedStations.value.length > 1);

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

 

const getStationStyle = ( station ) => {
  if ( station.aiControlAllowed ) {
    return { color: '#FFA500' };
  }
  
  const activeStatuses = ['ONLINE', 'BROADCASTING'];
  if ( activeStatuses.includes( station.currentStatus ) ) {
    return { color: station.color };
  }
  return {};
};

const formatStationName = ( name ) => {
  const capitalized = name.charAt( 0 ).toUpperCase() + name.slice( 1 );
  return capitalized.length > 6 ? `${capitalized.substring( 0, 6 )}...` : capitalized;
};


const indicatorClass = computed( () => {
  if ( isAsleep.value ) return 'waiting';
  return bufferStatus.value;
} );

const dynamicBorderStyle = computed( () => {
  return storeDynamicBorderStyle.value;
} );

const pulsingBorderStyle = computed( () => {
  if (uiStore.disableAnimations) return {};
  if (!isBroadcasting.value && !isWaitingForCurator.value) return {};

  const intensity = isBroadcasting.value ? animationIntensity.value : idleIntensity.value;
  const color = stationColor.value || '#FFA500';

  let r = 0, g = 0, b = 0;
  if ( color.startsWith( '#' ) && color.length === 7 ) {
    r = parseInt( color.substring( 1, 3 ), 16 );
    g = parseInt( color.substring( 3, 5 ), 16 );
    b = parseInt( color.substring( 5, 7 ), 16 );
  } else if ( color.startsWith( '#' ) && color.length === 4 ) {
    const rHex = color.substring( 1, 2 );
    const gHex = color.substring( 2, 3 );
    const bHex = color.substring( 3, 4 );
    r = parseInt( rHex + rHex, 16 );
    g = parseInt( gHex + gHex, 16 );
    b = parseInt( bHex + bHex, 16 );
  }

  const spread = 5 + ( intensity * 20 );
  const blur = 10 + ( intensity * 15 );
  const alpha = 0.4 + ( intensity * 0.4 );

  return {
    boxShadow: `0 0 ${blur}px ${spread}px rgba(${r}, ${g}, ${b}, ${alpha})`,
    transition: 'box-shadow 0.05s linear'
  };
} );

const getButtonType = ( station ) => {
  return stationStore.radioName === station.name ? 'primary' : 'default';
};


const handleStationClick = ( station ) => {
  stationStore.setStation( station.name );
};

const handleDropdownSelect = ( key ) => {
  stationStore.setStation( key );
};


watch( () => radioName.value, ( newName, oldName ) => {
  if ( newName && newName !== oldName ) {
    console.log( `Station changed to: ${newName}` );
  }
}, { immediate: true } );
</script>
