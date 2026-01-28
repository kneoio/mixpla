<template>
  <!-- single grid cell -->
  <div
    class="grid-cell"
    :class="{ dark: uiStore.theme === 'dark' }"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  >
    <!-- subtle outline so you can see the grid while developing -->
    <div class="debug-border" />

    <!-- slot: put whatever you want in the middle -->
    <transition name="pop">
      <div v-if="hovered" class="content">
        <slot />
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useUiStore } from '@/stores/ui'

const uiStore = useUiStore()
const hovered = ref(false)
</script>

<style scoped>
.grid-cell {
  position: relative;
  width: 100%;
  height: 100%;
  background: #fff; /* white theme default */
  transition: background 0.25s;
}
.grid-cell.dark {
  background: #000; /* black theme */
}

.debug-border {
  position: absolute;
  inset: 0;
  border: 1px solid rgba(127, 127, 127, 0.08);
  pointer-events: none;
}

.content {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: v-bind('uiStore.theme === "dark" ? "#fff" : "#000"');
}

/* tiny scale-in animation */
.pop-enter-active,
.pop-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.pop-enter-from,
.pop-leave-to {
  transform: scale(0.85);
  opacity: 0;
}
</style>