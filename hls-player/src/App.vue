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
      <p class="version-text">v.{{ VERSION }}</p>
      <div class="message-section">
        <div v-if="isAuthenticated">
          <transition name="fade" mode="out-in">
            <div v-if="!showMessageInput" key="button" class="message-button-wrapper">
              <n-button 
                type="primary" 
                @click="toggleMessageInput" 
                class="message-button"
                round
                size="medium"
                circle
              >
                <template #icon>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                </template>
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
                  type="primary" 
                  @click="handleMessageSubmit" 
                  :disabled="!messageText.trim()"
                  class="send-button"
                  round
                  size="large"
                  circle
                >
                  <template #icon>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                  </template>
                </n-button>
                <n-button 
                  @click="cancelMessage" 
                  class="cancel-button"
                  round
                  size="small"
                  secondary
                  circle
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
  </n-config-provider>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { NConfigProvider, NGlobalStyle, NButton, NInput } from 'naive-ui';
import { darkTheme } from 'naive-ui';
import { useUiStore } from './stores/ui';
import { useAuthStore } from './stores/auth';
import { VERSION } from './config/version';

// Message dialog state
const showMessageInput = ref(false);
const messageText = ref('');

// Debug function to log auth state
const logAuthState = () => {
  console.log('Auth state:', {
    isAuthenticated: authStore.isAuthenticated,
    user: authStore.user,
    showMessageInput: showMessageInput.value
  });};

const messageInput = ref(null);

const focusMessageInput = () => {
  if (messageInput.value) {
    messageInput.value.focus();
  }
};

const toggleMessageInput = () => {
  console.log('Toggle message input. Current state:', showMessageInput.value);
  showMessageInput.value = !showMessageInput.value;
  logAuthState();
  
  if (showMessageInput.value) {
    nextTick(() => {
      focusMessageInput();
    });
  }
};

const handleMessageSubmit = async () => {
  if (!messageText.value.trim()) return;
  
  try {
    console.log('Message to send:', messageText.value);
    window.$message?.success('Message sent!');
    messageText.value = '';
    showMessageInput.value = false;
  } catch (error) {
    console.error('Failed to send message:', error);
    window.$message?.error('Failed to send message. Please try again.');
  }
};

const cancelMessage = () => {
  messageText.value = '';
  showMessageInput.value = false;
};

const uiStore = useUiStore();
const authStore = useAuthStore();
const isAuthenticated = computed(() => authStore.isAuthenticated);

// Initialize auth when component mounts
onMounted(async () => {
  try {
    await authStore.init();
    console.log('Auth initialized. Authenticated:', authStore.isAuthenticated);
  } catch (error) {
    console.error('Failed to initialize auth:', error);
  }
});

// Watch for auth state changes
watch(() => authStore.isAuthenticated, (newValue) => {
  console.log('Auth state changed:', newValue);
});

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

.message-button,
.send-button {
  width: 100%;
  max-width: 200px;
  transition: all 0.2s ease;
  background-color: #18a058;
  margin: 0 auto;
}

.message-button:hover,
.send-button:hover {
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

/* Dark mode support */
html.dark .n-card {
  background-color: var(--n-color);
  border: 1px solid var(--n-border-color);
}

/* Ensure proper spacing for the version text */
.version-text {
  margin: 0 0 1rem 0;
  color: var(--n-text-color);
  font-size: 0.9em;
  opacity: 0.8;
}


</style>
