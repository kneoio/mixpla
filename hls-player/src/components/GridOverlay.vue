<template>
  <div class="grid-overlay revealed">
    <div class="grid-container" :style="gridStyle">
      <div
        v-for="(cell, i) in cells"
        :key="i"
        class="grid-cell"
        :class="{ dark: uiStore.theme === 'dark' }"
      >
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useUiStore } from '@/stores/ui'

const props = defineProps({
  rows: { type: Number, default: 40 },
  cols: { type: Number, default: 60 },
  artistList: { type: Array, default: () => [] }
})

const uiStore = useUiStore()

const cells = Array.from({ length: props.rows * props.cols }, (_, i) => ({
  station: props.artistList[i % props.artistList.length]
}))

const gridStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${props.cols}, 1fr)`,
  gridTemplateRows: `repeat(${props.rows}, 1fr)`
}))
</script>

<style scoped>
.grid-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 1;
  z-index: 10;
}
.grid-container {
  width: 100%;
  height: 100%;
}
.grid-cell {
  position: relative;
  width: 100%;
  height: 100%;
  background: transparent;
  transition: background 0.25s;
}
.grid-cell.dark {
  background: rgba(0, 0, 0, 0.05);
}
</style>