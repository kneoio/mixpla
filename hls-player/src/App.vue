<template>
  <n-config-provider :theme="naiveTheme" :theme-overrides="themeOverrides">
    <n-global-style />
    <div id="nav">
      <!--hide for now-->
      <!--<router-link to="/">Home</router-link> | -->
      <!--<router-link to="/profile">Profile</router-link>-->
    </div>
    <router-view />
    <footer>
      <p class="version-text">v.1.9</p>
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


</style>
