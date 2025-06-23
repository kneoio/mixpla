<template>
  <n-config-provider :theme="naiveTheme" :theme-overrides="themeOverrides">
    <n-global-style />
    <div id="nav">
      <router-link to="/">Home</router-link> | 
      <router-link to="/profile">Profile</router-link>
    </div>
    <router-view />
    <footer>
      <p class="version-text">v.1.8</p>
    </footer>
  </n-config-provider>
</template>

<script setup>
import { computed, watch } from 'vue';
import { NConfigProvider, NGlobalStyle, darkTheme } from 'naive-ui';
import { useUiStore } from './stores/ui';

const uiStore = useUiStore();

const naiveTheme = computed(() => (uiStore.theme === 'dark' ? darkTheme : null));

const themeOverrides = {
  common: {
    primaryColor: '#4b5563',
    primaryColorHover: '#374151',
    primaryColorPressed: '#1f2937',
    primaryColorSuppl: '#374151'
  }
};

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
@font-face {
  font-family: 'Goldman';
  src: url('./assets/fonts/Goldman-Regular.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
}

@font-face {
  font-family: 'Goldman';
  src: url('./assets/fonts/Goldman-Bold.ttf') format('truetype');
  font-weight: 700;
  font-style: normal;
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
  0% {
    box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.7);
  }
  70% {
    box-shadow: 0 0 0 8px rgba(244, 67, 54, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(244, 67, 54, 0);
  }
}

@keyframes pulse-yellow {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.7);
  }
  70% {
    box-shadow: 0 0 0 8px rgba(255, 193, 7, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 193, 7, 0);
  }
}
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
