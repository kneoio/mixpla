<template>
  <div id="app-container" :style="dynamicBorderStyle" :class="{ 'warming-up': stationStore.isWarmingUp }">
    <div class="station-selector-wrapper">
      <n-button-group>
        <n-button
          v-for="station in mainStations"
          :key="station.name"
          :type="stationStore.radioName === station.name ? 'primary' : 'default'"
          @click="stationStore.setStation(station.name)"
          :style="getStationStyle(station)"
        >
          {{ formatStationName(station.name) }}
        </n-button>
      </n-button-group>
      <n-dropdown v-if="dropdownOptions.length" trigger="click" :options="dropdownOptions" @select="stationStore.setStation">
        <n-button :type="isDropdownStationActive ? 'primary' : 'default'">...</n-button>
      </n-dropdown>

      <!-- Auth Button -->
      <n-button
        v-if="!authStore.isAuthenticated"
        @click="authStore.login()"
        :disabled="authStore.isLoading"
        type="default"
      >
        Login
      </n-button>
      <n-button
        v-if="authStore.isAuthenticated"
        @click="authStore.logout()"
        :disabled="authStore.isLoading"
        type="warning"
      >
        Logout ({{ authStore.user?.preferred_username }})
      </n-button>
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
import { onMounted, onBeforeUnmount, computed, watch, ref, h } from 'vue';
import { NButton, NDropdown, NButtonGroup, NSwitch } from 'naive-ui';
import HlsPlayer from '../components/HlsPlayer.vue';
import { useUiStore } from '../stores/ui';
import { useStationStore } from '../stores/station';
import { useAuthStore } from '../stores/auth';

const uiStore = useUiStore();
const stationStore = useStationStore();
const authStore = useAuthStore();

onMounted(() => {
  stationStore.fetchStations();
});

const mainStations = computed(() => stationStore.stations.slice(0, 4));
const dropdownStations = computed(() => stationStore.stations.slice(4));

const getStationStyle = (station) => {
  const activeStatuses = ['ONLINE', 'BROADCASTING', 'WAITING_FOR_CURATOR'];
  if (activeStatuses.includes(station.currentStatus)) {
    return { color: station.color };
  }
  return {};
};

const formatStationName = (name) => {
  const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
  return capitalized.length > 6 ? `${capitalized.substring(0, 6)}...` : capitalized;
};

const dropdownOptions = computed(() =>
  dropdownStations.value.map(station => ({
    label: station.name.charAt(0).toUpperCase() + station.name.slice(1),
    key: station.name,
    props: {
      style: getStationStyle(station)
    }
  }))
);

const isDropdownStationActive = computed(() => 
  dropdownStations.value.some(s => s.name === stationStore.radioName)
);

const indicatorClass = computed(() => {
  if (stationStore.isAsleep) return 'waiting';
  if (stationStore.isWaitingForCurator) return 'waiting';
  if (stationStore.isWarmingUp) return 'waiting';
  return stationStore.bufferStatus;
});

const dynamicBorderStyle = computed(() => {
  if (stationStore.isWarmingUp) {
    return {
      '--dynamic-border-rgb': '128, 128, 128',
      '--dynamic-border-color': 'rgba(128, 128, 128, 0.5)',
    };
  }

  const style = { ...stationStore.dynamicBorderStyle };
  if (stationStore.isBroadcasting) {
    style.animation = 'fire-flicker 2s infinite linear';
  }
  return style;
});

watch(() => stationStore.radioName, (newName, oldName) => {
  if (newName && newName !== oldName) {
    console.log(`Station changed to: ${newName}`);
  }
}, { immediate: true });
</script>

<style scoped>
/* Scoped styles from App.vue are moved here */
#app-container {
  padding: 1.5rem;
  border-radius: 15px;
  position: relative;
  width: 100%;
  max-width: 400px;
  box-sizing: border-box;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  border: 2px solid transparent;
  transition: all 0.5s ease-in-out;
}

#app-container[style*='--dynamic-border-color'] {
  border: 2px solid var(--dynamic-border-color);
  transition: box-shadow 0.1s ease-out;
}

@keyframes fire-flicker {
  0%   { box-shadow: 0 0 10px 4px rgba(var(--dynamic-border-rgb), 0.5), inset 0 0 5px 2px rgba(var(--dynamic-border-rgb), 0.3); }
  20%  { box-shadow: 0 0 25px 10px rgba(var(--dynamic-border-rgb), 0.8), inset 0 0 10px 4px rgba(var(--dynamic-border-rgb), 0.5); }
  40%  { box-shadow: 0 0 15px 6px rgba(var(--dynamic-border-rgb), 0.6), inset 0 0 7px 3px rgba(var(--dynamic-border-rgb), 0.4); }
  60%  { box-shadow: 0 0 30px 12px rgba(var(--dynamic-border-rgb), 0.9), inset 0 0 12px 6px rgba(var(--dynamic-border-rgb), 0.6); }
  80%  { box-shadow: 0 0 12px 5px rgba(var(--dynamic-border-rgb), 0.7), inset 0 0 6px 2px rgba(var(--dynamic-border-rgb), 0.5); }
  100% { box-shadow: 0 0 10px 4px rgba(var(--dynamic-border-rgb), 0.5), inset 0 0 5px 2px rgba(var(--dynamic-border-rgb), 0.3); }
}

#app-container.warming-up {
  animation: fire-flicker 0.8s infinite linear;
}

.station-selector-wrapper {
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
}

.theme-switch-wrapper {
  position: fixed;
  top: 15px;
  right: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  z-index: 10;
}

.status-indicator-wrapper-top-left {
  position: fixed;
  top: 22px;
  left: 22px;
  display: flex;
  align-items: center;
  z-index: 10;
}

.buffer-indicator {
  width: 12px;
  height: 12px;
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
  0% { box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.7); }
  70% { box-shadow: 0 0 0 8px rgba(244, 67, 54, 0); }
  100% { box-shadow: 0 0 0 0 rgba(244, 67, 54, 0); }
}

@keyframes pulse-yellow {
  0% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.7); }
  70% { box-shadow: 0 0 0 8px rgba(255, 193, 7, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0); }
}
</style>
