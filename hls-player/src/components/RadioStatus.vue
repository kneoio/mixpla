<template>
  <div class="status-container">
    <h1 class="radio-title">{{ store.stationName }}</h1>
    <div class="status-text" :class="{ error: store.error }">{{ store.displayMessage }}</div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { useRadioStatusStore } from '@/stores/radioStatus';

const PARAMETER_NAME = 'radio';
const store = useRadioStatusStore();

onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const radioName = urlParams.get(PARAMETER_NAME) || 'bratan'; // Default to 'bratan' if not specified
  store.startPolling(radioName);
});

onUnmounted(() => {
  store.stopPolling();
});
</script>

<style scoped>
.status-container {
  padding: 10px;
  margin-bottom: 15px;
  text-align: center;
}

.radio-title {
  font-size: 1.8em;
  font-weight: bold;
  margin-top: 0;
  margin-bottom: 0.5em;
}

.status-text {
  font-size: 0.9em;
  color: #555;
  min-height: 1.2em; /* Prevents layout shift */
}

.status-text.error {
  color: red;
  font-weight: bold;
}
</style>
