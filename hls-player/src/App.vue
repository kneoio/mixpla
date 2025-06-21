<template>
  <n-config-provider :theme="naiveTheme" :theme-overrides="themeOverrides">
    <n-global-style />
    <div id="app-container" :style="dynamicBorderStyle">
      <div class="station-selector-wrapper">
        <n-radio-group :value="stationStore.radioName" name="station-selector" @update:value="stationStore.setStation">
          <n-radio-button
            v-for="station in stationStore.stations"
            :key="station"
            :value="station"
            :label="station.charAt(0).toUpperCase() + station.slice(1)"
          />
        </n-radio-group>
      </div>
      <div class="theme-switch-wrapper">
        <n-switch :value="uiStore.theme === 'dark'" @update:value="uiStore.toggleTheme" />
        <span>Dark Mode</span>
      </div>
      <HlsPlayer />
    </div>
  </n-config-provider>
</template>

<script setup>
import { onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { NConfigProvider, NGlobalStyle, darkTheme, NRadioGroup, NRadioButton } from 'naive-ui';
import HlsPlayer from './components/HlsPlayer.vue';
import { useUiStore } from './stores/ui';
import { NSwitch } from 'naive-ui';
import { useStationStore } from './stores/station';

const uiStore = useUiStore();
const stationStore = useStationStore();

const themeOverrides = {
  common: {
    primaryColor: '#6b7280', // gray-500
    primaryColorHover: '#4b5563', // gray-600
    primaryColorPressed: '#374151', // gray-700
    primaryColorSuppl: '#4b5563'
  }
};

const dynamicBorderStyle = computed(() => {
  const style = { ...stationStore.dynamicBorderStyle };
  if (style['--dynamic-border-color']) {
    const intensity = stationStore.animationIntensity;
    const blur = 5 + intensity * 20; // from 5px to 25px
    const spread = 2 + intensity * 6; // from 2px to 8px
    style.boxShadow = `0 0 ${blur}px ${spread}px rgba(var(--dynamic-border-rgb), 0.7)`;
  }
  return style;
});

const naiveTheme = computed(() => (uiStore.theme === 'dark' ? darkTheme : null));

onMounted(() => {
  stationStore.startPolling();
});

onBeforeUnmount(() => {
  stationStore.stopPolling();
});

// Watch for theme changes and apply background color to the body
watch(() => uiStore.theme, (newTheme) => {
  const body = document.body;
  if (newTheme === 'dark') {
    body.style.backgroundColor = darkTheme.common.bodyColor;
  } else {
    body.style.backgroundColor = '#fdfdfd'; // A slightly off-white for light theme
  }
}, { immediate: true });
</script>

<style>
html {
  box-sizing: border-box;
}

*,
*::before,
*::after {
  box-sizing: inherit;
}

body {
  margin: 0;
  padding: 0; /* Reset body padding */
  width: 100%;
  min-height: 100vh;
  overflow-x: hidden; /* Prevent horizontal scroll */
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: background-color 0.3s ease, padding-bottom 0.3s ease;
  box-sizing: border-box;
  padding: 20px; /* Keep padding for nice gaps on sides */
}

#app-container {
  padding: 1.5rem;
  border-radius: 15px;
  position: relative;
  width: 100%;
  max-width: 400px; /* Back to original size */
  box-sizing: border-box;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  border: 2px solid transparent;
  transition: all 0.5s ease-in-out;
}

/* Apply animation when the custom property is set */
#app-container[style*='--dynamic-border-color'] {
  border: 2px solid var(--dynamic-border-color);
  transition: box-shadow 0.1s ease-out;
}

.station-selector-wrapper {
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: center;
  flex-wrap: wrap; /* Allow buttons to wrap */
  gap: 8px; /* Add gap between wrapped buttons */
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

#hls-player-container {
  padding: 15px;
  border-radius: 8px;
  /* Default transparent border to prevent layout shift when color is applied */
  border: 2px solid transparent;
  transition: border 0.5s ease-in-out;
}

h1 {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 2rem;
}
</style>
