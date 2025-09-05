<template>
  <n-config-provider :theme="naiveTheme" :theme-overrides="themeOverrides">
    <n-message-provider>
      <n-global-style />
    <div id="nav">
      <!--hide for now-->
      <!--<router-link to="/">Home</router-link> | -->
      <!--<router-link to="/profile">Profile</router-link>-->
    </div>
    
    <div class="app-content">
      <router-view />
      <AudioDiagnostics v-if="showDiagnostics" />
    </div>
    

    <footer>
      <p class="version-text">v.{{ VERSION }}</p>
      <div class="message-section">
        <div v-if="isAuthenticated">
          <transition name="fade" mode="out-in">
            <div v-if="!showMessageInput" key="button" class="message-button-wrapper">
              <n-button 
                @click="toggleMessageInput" 
                class="message-button invisible-button no-round"
                size="large"
                text
                :round="false"
              >
              </n-button>
            </div>
            <div v-else key="input" class="message-input-wrapper">
              <n-input
                v-model:value="messageText"
                type="textarea"
                placeholder="Type your message here..."
                :autosize="{
                  minRows: 4,
                  maxRows: 4
                }"
                @keydown.enter.exact.prevent="handleMessageSubmit"
                class="message-textarea"
                ref="messageInput"
                @vue:mounted="focusMessageInput"
              />
              <div class="message-actions">
                <n-button 
                  @click="handleMessageSubmit" 
                  :disabled="!messageText.trim()"
                  class="send-button gradient-button no-round"
                  size="large"
                  :round="false"
                >
                  <template #icon>
                    <n-icon :component="Comet" size="20" />
                  </template>
                </n-button>
                <n-button 
                  @click="cancelMessage" 
                  class="cancel-button no-round"
                  size="small"
                  secondary
                  :round="false"
                  :style="{ '--n-border-radius': '0px' }"
                >
                  <template #icon>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                  </template>
                </n-button>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </footer>
    
    <!-- Diagnostics Toggle Button (only shown with ?debug=1 parameter) -->
    <div v-if="debugMode" class="diagnostics-toggle">
      <n-button 
        @click="showDiagnostics = !showDiagnostics" 
        type="primary" 
        size="small"
        style="position: fixed; bottom: 20px; right: 20px; z-index: 1000;"
        class="no-round"
        :round="false"
      >
        {{ showDiagnostics ? 'Hide Diagnostics' : 'Show Diagnostics' }}
      </n-button>
    </div>

    </n-message-provider>
  </n-config-provider>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { NConfigProvider, NGlobalStyle, NButton, NInput, NIcon, NMessageProvider } from 'naive-ui';
import { Comet } from '@vicons/tabler';
import { darkTheme } from 'naive-ui';
import { useUiStore } from './stores/ui';
import { useStationStore } from './stores/station';

import { storeToRefs } from 'pinia';
import { VERSION } from './config/version';
import AudioDiagnostics from './components/AudioDiagnostics.vue';

const showMessageInput = ref(false);
const messageText = ref('');
let autoCloseTimer = null;

 

const messageInput = ref(null);

const focusMessageInput = () => {
  if (messageInput.value) {
    messageInput.value.focus();
  }
};

const toggleMessageInput = () => {
  console.log('// Toggle message input visibility');
  showMessageInput.value = !showMessageInput.value;
  if (showMessageInput.value) {
    startAutoCloseTimer();
    nextTick(() => {
      const textarea = document.querySelector('.message-textarea textarea');
      if (textarea) {
        textarea.focus();
      }
    });
  } else {
    clearAutoCloseTimer();
  }
};

const startAutoCloseTimer = () => {
  clearAutoCloseTimer(); 
  autoCloseTimer = setTimeout(() => {
    if (showMessageInput.value) {
      cancelMessage();
    }
  }, 30000); // 30 seconds
};

const clearAutoCloseTimer = () => {
  if (autoCloseTimer) {
    clearTimeout(autoCloseTimer);
    autoCloseTimer = null;
  }
};

const handleMessageSubmit = async () => {
  if (!messageText.value.trim()) return;
  
  try {
    console.log('Sending message to server:', messageText.value);
    
    // Get current station brand for the message
    const currentBrand = stationStore.radioName || 'aizoo';
    
    // Send message to server
    await sendMessage(messageText.value, currentBrand);
    
    console.log('Message sent successfully');
    window.$message?.success('Message sent!');
    
    // Clear the input and close
    messageText.value = '';
    showMessageInput.value = false;
    clearAutoCloseTimer();
  } catch (error) {
    console.error('Failed to send message:', error);
    window.$message?.error('Failed to send message. Please try again.');
  }
};

const cancelMessage = () => {
  messageText.value = '';
  showMessageInput.value = false;
  clearAutoCloseTimer();
};

const uiStore = useUiStore();
const stationStore = useStationStore();

const { theme } = storeToRefs(uiStore);
const { radioName } = storeToRefs(stationStore);

const showDiagnostics = ref(false);

const debugMode = computed(() => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('debug') === '1' || urlParams.get('debug') === 'true';
});

const isAuthenticated = ref(true);

 

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

/* Message section styles */
.message-section {
  width: 100%;
  margin-top: 1.5rem;
  transition: all 0.3s ease;
}

.message-button-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
}

.message-button {
  width: 100%;
  max-width: 200px;
  transition: all 0.2s ease;
  background-color: #18a058;
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

.invisible-button {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  color: transparent !important;
  min-height: 60px !important;
  min-width: 100% !important;
  max-width: 100% !important;
  padding: 20px !important;
  cursor: pointer;
}

.invisible-button:hover {
  background: transparent !important;
  transform: none !important;
}

.message-button:hover {
  transform: translateY(-1px);
  background-color: #36ad6a;
}

.message-input-wrapper {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  padding: 0 1rem;
}

.message-textarea {
  width: 100%;
  margin-bottom: 0.5rem;
  border-radius: 8px;
  transition: border-color 0.3s ease;
}

.message-textarea textarea {
  text-align: left !important;
}

.message-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.cancel-button {
  color: #666;
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
