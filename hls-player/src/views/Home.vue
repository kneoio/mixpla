<template>
  <div id="app-container" :style="[dynamicBorderStyle, pulsingBorderStyle]" :class="{ 'warming-up': isWarmingUp }">
    <div class="station-selector-wrapper">
      <n-button-group>
        <n-button v-for=" station in mainStations " :key="station.name" :type="getButtonType( station )"
          @click="handleStationClick( station )" :style="getStationStyle( station )" :disabled="getButtonDisabled( station )">
          {{ formatStationName( station.name ) }}
        </n-button>
      </n-button-group>
      <n-dropdown v-if=" dropdownOptions.length " trigger="click" :options="dropdownOptions"
        @select="handleDropdownSelect">
        <n-button :type="isDropdownStationActive ? 'primary' : 'default'">...</n-button>
      </n-dropdown>
    </div>

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
import { useAuthStore } from '../stores/auth';
import { storeToRefs } from 'pinia';

const uiStore = useUiStore();
const stationStore = useStationStore();
const authStore = useAuthStore();


const {
  stations,
  radioName,
  isAsleep,

  isWarmingUp,
  bufferStatus,
  dynamicBorderStyle: storeDynamicBorderStyle,
  isBroadcasting,
  animationIntensity,
  stationColor
} = storeToRefs( stationStore );

onMounted(async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const radioParam = urlParams.get('radio');

  await stationStore.fetchStations(false);

  if (radioParam) {
    const previousStation = localStorage.getItem('lastStation');
    localStorage.removeItem('lastStation');

    stationStore.radioName = radioParam;

    try {
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL || window.location.origin}/${radioParam.toLowerCase()}/radio/status`;
      const response = await fetch(apiUrl);

      if (response.ok) {
        const stationData = await response.json();

        const apiStation = {
          name: radioParam.toLowerCase(),
          color: stationData.color || '#FFA500',
          currentStatus: stationData.currentStatus || 'UNKNOWN',
          type: 'api'
        };

        await stationStore.setStation(apiStation);
        stationStore.startPolling();
      } else {
        throw new Error(`API returned ${response.status}`);
      }
    } catch (error) {
      stationStore.radioName = radioParam.toLowerCase();
      stationStore.stationName = radioParam.toLowerCase();
      stationStore.statusText = `Station '${radioParam}' not found`;
      stationStore.isAsleep = false;

      stationStore.isWarmingUp = false;
      stationStore.isBroadcasting = false;
      stationStore.stationColor = '#ef4444';
      stationStore.startPolling();
    }
  }
} );

const mainStations = computed( () => stations.value.slice( 0, 4 ) );
const dropdownStations = computed( () => stations.value.slice( 4 ) );

const getStationStyle = ( station ) => {
  const activeStatuses = ['ONLINE', 'BROADCASTING'];
  if ( activeStatuses.includes( station.currentStatus ) ) {
    return { color: station.color };
  }
  return {};
};

const formatStationName = ( name ) => {
  if ( name === 'login' ) return 'Login';
  if ( name === 'logout' ) return authStore.isAuthenticated ? `Logout (${authStore.user?.preferred_username})` : 'Logout';

  const capitalized = name.charAt( 0 ).toUpperCase() + name.slice( 1 );
  return capitalized.length > 6 ? `${capitalized.substring( 0, 6 )}...` : capitalized;
};

const dropdownOptions = computed( () =>
  dropdownStations.value
    .map( station => ( {
      label: station.type === 'auth' ? formatStationName( station.name ) : station.name.charAt( 0 ).toUpperCase() + station.name.slice( 1 ),
      key: station.name,
      props: {
        style: getStationStyle( station )
      }
    } ) )
);

const isDropdownStationActive = computed( () =>
  dropdownStations.value.some( s => s.name === radioName.value )
);

const indicatorClass = computed( () => {
  if ( isAsleep.value ) return 'waiting';

  if ( isWarmingUp.value ) return 'waiting';
  return bufferStatus.value;
} );

const dynamicBorderStyle = computed( () => {
  if ( isWarmingUp.value ) {
    return {
      '--dynamic-border-rgb': '128, 128, 128',
    };
  }
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
  if ( station.name === 'login' ) return 'default';
  if ( station.name === 'logout' ) return 'warning';
  return stationStore.radioName === station.name ? 'primary' : 'default';
};

const getButtonDisabled = ( station ) => {
  if ( station.name === 'login' ) return authStore.isAuthenticated;
  if ( station.name === 'logout' ) return !authStore.isAuthenticated;
  return false;
};

const handleStationClick = ( station ) => {
  if ( station.name === 'login' ) {
    authStore.login();
  } else if ( station.name === 'logout' ) {
    authStore.logout();
  } else {
    stationStore.setStation( station.name );
  }
};

const handleDropdownSelect = ( key ) => {
  if ( key === 'login' ) {
    authStore.login();
  } else if ( key === 'logout' ) {
    authStore.logout();
  } else {
    stationStore.setStation( key );
  }
};

watch( () => radioName.value, ( newName, oldName ) => {
  if ( newName && newName !== oldName ) {
    console.log( `Station changed to: ${newName}` );
  }
}, { immediate: true } );
</script>
