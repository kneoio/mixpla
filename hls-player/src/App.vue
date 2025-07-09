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
      <div v-if="isAuthenticated" class="message-button-wrapper">
        <n-button type="primary" @click="showMessageDialog = true" class="message-button">
          Send Message
        </n-button>
      </div>
    </footer>

    <!-- Message Input Dialog -->
    <n-modal v-model:show="showMessageDialog" :mask-closable="false">
      <n-card
        style="width: 90%; max-width: 500px;"
        title="Send a Message"
        :bordered="false"
        size="huge"
        role="dialog"
        aria-modal="true"
      >
        <n-input
          v-model:value="messageText"
          type="textarea"
          placeholder="Type your message here..."
          :autosize="{
            minRows: 3,
            maxRows: 10
          }"
          @keydown.enter.prevent="handleMessageSubmit"
        />
        <template #footer>
          <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px;">
            <n-button @click="showMessageDialog = false">Cancel</n-button>
            <n-button type="primary" @click="handleMessageSubmit" :disabled="!messageText.trim()">
              Send
            </n-button>
          </div>
        </template>
      </n-card>
    </n-modal>
  </n-config-provider>
</template>

<script setup>
import { computed, watch, ref } from 'vue';
import { NConfigProvider, NGlobalStyle, darkTheme, NButton, NModal, NCard, NInput } from 'naive-ui';
import { useUiStore } from './stores/ui';
import { useAuthStore } from './stores/auth';
import { VERSION } from './config/version';

// Message dialog state
const showMessageDialog = ref(false);
const messageText = ref('');

const handleMessageSubmit = async () => {
  if (!messageText.value.trim()) return;
  
  try {
    // Here you can add your message submission logic
    console.log('Message to send:', messageText.value);
    
    // Simulate API call
    // await messageApi.sendMessage(messageText.value);
    
    // Show success message
    window.$message?.success('Message sent successfully!');
    
    // Reset and close dialog
    messageText.value = '';
    showMessageDialog.value = false;
  } catch (error) {
    console.error('Failed to send message:', error);
    window.$message?.error('Failed to send message. Please try again.');
  }
};

const uiStore = useUiStore();
const authStore = useAuthStore();

const naiveTheme = computed(() => (uiStore.theme === 'dark' ? darkTheme : null));

// Check if user is authenticated
const isAuthenticated = computed(() => authStore.isAuthenticated);

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

/* Message button styles */
.message-button-wrapper {
  margin-top: 1.5rem;
  width: 100%;
  display: flex;
  justify-content: center;
}

.message-button {
  width: 100%;
  max-width: 200px;
  transition: all 0.3s ease;
  background-color: #18a058; /* Match primary button color */
  margin: 0 auto;
}

.message-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background-color: #36ad6a; /* Slightly lighter on hover */
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
