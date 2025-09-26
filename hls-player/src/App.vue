<template>
  <n-config-provider :theme="naiveTheme" :theme-overrides="themeOverrides">
    <n-message-provider>
      <n-global-style />
    
    <div class="app-content">
      <router-view />
    </div>
    
    <footer>
      <p class="version-text">v.{{ VERSION }}</p>     
    </footer>

  </n-message-provider>
  </n-config-provider>
</template>

<script setup>
import { computed, watch } from 'vue';
import { NConfigProvider, NGlobalStyle, NMessageProvider } from 'naive-ui';
import { darkTheme } from 'naive-ui';
import { useUiStore } from './stores/ui';
import { VERSION } from './config/version';
const uiStore = useUiStore();
const naiveTheme = computed(() => (uiStore.theme === 'dark' ? darkTheme : null));

const themeOverrides = {
  common: {
    primaryColor: '#4b5563',
    primaryColorHover: '#374151',
    primaryColorPressed: '#1f2937',
    primaryColorSuppl: '#374151'
  },
  Button: {
    borderRadiusTiny: '0px',
    borderRadiusSmall: '0px',
    borderRadiusMedium: '0px',
    borderRadiusLarge: '0px'
  }
};

watch(() => uiStore.theme, (newTheme) => {
  const body = document.body;
  if (newTheme === 'dark') {
    body.style.backgroundColor = darkTheme.common.bodyColor;
  } else {
    body.style.backgroundColor = '#fdfdfd';
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
  position: relative;
}

/* Footer styles */
footer {
  margin: 0;
  padding: 0.5rem 0 1rem 0;
  text-align: center;
  color: #666;
  font-size: 0.9rem;
  border-top: none;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
}

.gradient-button {
  min-width: 48px !important;
  width: 48px !important;
  height: 48px !important;
  border-radius: 0 !important;
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  background: linear-gradient(to right, #2563eb, #9333ea) !important;
  border: 2px solid transparent !important;
  color: white !important;
  font-weight: bold !important;
  transition: all 0.5s ease-out !important;
  transform: scale(1) !important;
}

.gradient-button:hover {
  border-color: #2563eb !important;
  background: linear-gradient(to right, transparent, transparent) !important;
  color: #2563eb !important;
  transform: scale(1.05) !important;
}
/* Animation */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Modal styles */
.n-card {
  border-radius: 12px !important;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2) !important;
}

.n-card__content {
  padding: 20px 0;
}

.n-card__footer {
  padding-top: 16px;
  border-top: 1px solid var(--n-divider-color);
}

html.dark .n-card {
  background-color: var(--n-color);
  border: 1px solid var(--n-border-color);
}

.version-text {
  margin: 0 0 1rem 0;
  color: var(--n-text-color);
  font-size: 0.9em;
  opacity: 0.8;
}
</style>
