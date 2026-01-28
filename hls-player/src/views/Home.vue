<template>
  <div id="app-container" :style="[dynamicBorderStyle, pulsingBorderStyle]">
    <!-- top-left buffer indicator -->
    <div class="status-indicator-wrapper-top-left">
      <div :class="['buffer-indicator', indicatorClass]"></div>
    </div>

    <!-- theme / animation toggles (only while paused) -->
    <div class="theme-switch-wrapper" v-if="isPaused">
      <n-switch
        size="medium"
        :value="uiStore.theme === 'dark'"
        @update:value="uiStore.toggleTheme"
        :round="false"
      />
      <span>Theme</span>

      <n-switch
        size="medium"
        :value="!uiStore.disableAnimations"
        @update:value="uiStore.toggleAnimationsDisabled"
        :round="false"
      />
      <span>Animation</span>
    </div>

    <!-- invisible grid overlay -->
    <GridOverlay @play="onGridPlay" />

    <!-- your existing player -->
    <HlsPlayer @play-state="onPlayState" />
  </div>
</template>

<script setup>
/* ---------- imports ---------- */
import {
  onMounted,
  onBeforeUnmount,
  computed,
  watch,
  ref
} from 'vue';
import { NSwitch } from 'naive-ui';

import HlsPlayer          from '@/components/HlsPlayer.vue';
import GridOverlay        from '@/components/GridOverlay.vue';

import { useUiStore }     from '@/stores/ui';
import { useStationStore } from '@/stores/station';
import { storeToRefs }    from 'pinia';

import '@/views/Home.css';

/* ---------- reactive state ---------- */
const uiStore      = useUiStore();
const stationStore = useStationStore();

const isPaused     = ref(true);
const onPlayState  = (e) => (isPaused.value = !e.playing);

/* ---------- store refs ---------- */
const {
  stations,
  radioName,
  isAsleep,
  bufferStatus,
  dynamicBorderStyle: storeDynamicBorderStyle,
  isBroadcasting,
  isWaitingForCurator,
  isWarmingUp,
  animationIntensity,
  stationColor
} = storeToRefs(stationStore);

/* ---------- grid handler ---------- */
function onGridPlay(artist) {
  console.log('[Grid] requested play:', artist);
  // stationStore.setStation(artist); // ← wire up when ready
}

/* ---------- mount / unmount ---------- */
onMounted(async () => {
  await stationStore.fetchStations(false);
});

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

onMounted(startIdlePulse);

onBeforeUnmount(() => {
  if (idleAnimId) cancelAnimationFrame(idleAnimId);
  idleAnimId = null;
});

/* ---------- url query helpers ---------- */
const urlParams         = computed(() => new URLSearchParams(window.location.search));
const radioParam        = computed(() => urlParams.value.get('radio'));
const requestedStations = computed(() =>
  radioParam.value ? radioParam.value.split(',').map(s => s.trim()) : []
);
const showStations      = computed(() => requestedStations.value.length > 1);

const displayStations = computed(() => {
  if (!requestedStations.value.length) return [];
  return requestedStations.value.map(name => {
    const existing = stations.value.find(
      s => s.name === name || s.slugName === name
    );
    return existing || {
      name,
      displayName: name,
      color: '#6b7280',
      currentStatus: 'UNKNOWN',
      type: 'station'
    };
  });
});

/* ---------- station helpers ---------- */
const getStationStyle = (station) => {
  if (station.aiControlAllowed) return { color: '#FFA500' };
  const active = ['ONLINE', 'BROADCASTING'];
  return active.includes(station.currentStatus) ? { color: station.color } : {};
};

const formatStationName = (name) => {
  const cap = name.charAt(0).toUpperCase() + name.slice(1);
  return cap.length > 6 ? `${cap.substring(0, 6)}…` : cap;
};

/* ---------- ui classes / styles ---------- */
const indicatorClass = computed(() =>
  isAsleep.value ? 'waiting' : bufferStatus.value
);

const dynamicBorderStyle = computed(() => storeDynamicBorderStyle.value);

const pulsingBorderStyle = computed(() => {
  if (uiStore.disableAnimations || isPaused.value) return {};

  const intensity = Math.max(animationIntensity.value, 0.18);
  const color     = stationColor.value || '#FFA500';

  let r = 0, g = 0, b = 0;
  if (color.startsWith('#') && color.length === 7) {
    r = parseInt(color.slice(1, 3), 16);
    g = parseInt(color.slice(3, 5), 16);
    b = parseInt(color.slice(5, 7), 16);
  } else if (color.startsWith('#') && color.length === 4) {
    const [_, rc, gc, bc] = color;
    r = parseInt(rc + rc, 16);
    g = parseInt(gc + gc, 16);
    b = parseInt(bc + bc, 16);
  }

  const spread = 5 + intensity * 20;
  const blur   = 10 + intensity * 15;
  const alpha  = 0.4 + intensity * 0.4;

  return {
    boxShadow: `0 0 ${blur}px ${spread}px rgba(${r},${g},${b},${alpha})`,
    transition: 'box-shadow 0.05s linear'
  };
});

/* ---------- station actions ---------- */
const getButtonType = (station) =>
  stationStore.radioName === station.name ? 'primary' : 'default';

const handleStationClick = (station) => stationStore.setStation(station.name);
const handleDropdownSelect = (key) => stationStore.setStation(key);

/* ---------- watchers ---------- */
watch(
  radioName,
  (newName, oldName) => {
    if (newName && newName !== oldName)
      console.log(`Station changed to: ${newName}`);
  },
  { immediate: true }
);
</script>