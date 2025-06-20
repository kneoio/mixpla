<template>
  <div class="app-container">
    <RadioStatus />
    <div id="hls-player-container">
      <HlsPlayer />
    </div>
  </div>
</template>

<script setup>
import { watch } from 'vue';
import HlsPlayer from './components/HlsPlayer.vue';
import RadioStatus from './components/RadioStatus.vue';
import { useRadioStatusStore } from './stores/radioStatus';

const store = useRadioStatusStore();

// Watch for changes in the border color from the Pinia store
watch(() => store.borderColor, (newColor) => {
  const playerContainer = document.getElementById('hls-player-container');
  if (playerContainer) {
    if (newColor) {
      playerContainer.style.border = `2px solid ${newColor}`;
    } else {
      // Set back to the default transparent border
      playerContainer.style.border = '2px solid transparent';
    }
  }
});
</script>

<style scoped>
.app-container {
  max-width: 500px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
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
