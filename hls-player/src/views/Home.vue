<template>
  <div id="app-container" :style="[dynamicBorderStyle, pulsingBorderStyle]">
    <div class="status-indicator-wrapper-top-left">
      <div :class="['buffer-indicator', indicatorClass]"></div>
    </div>
    <div class="theme-switch-wrapper">
      <n-switch :value="uiStore.theme === 'dark'" @update:value="uiStore.toggleTheme" />
      <span>Dark Mode</span>
    </div>
    <HlsPlayer />
  </div>
</template>

<script setup>
import { onMounted, computed, watch } from 'vue';
import { NButton, NDropdown, NButtonGroup, NSwitch } from 'naive-ui';
import HlsPlayer from '../components/HlsPlayer.vue';
import './Home.css';
import { useUiStore } from '../stores/ui';
import { useStationStore } from '../stores/station';
import { storeToRefs } from 'pinia';

const uiStore = useUiStore();
const stationStore = useStationStore();


const {
  stations,
  radioName,
  isAsleep,

  
  bufferStatus,
  dynamicBorderStyle: storeDynamicBorderStyle,
  isBroadcasting,
  animationIntensity,
  stationColor
} = storeToRefs( stationStore );

onMounted(async () => {
  localStorage.clear();
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
  }
  await stationStore.fetchStations(false);
} );

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
  if ( !isBroadcasting.value ) return {};

  const intensity = animationIntensity.value;
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
