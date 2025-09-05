import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { storageService } from '../services/storage';

export const useUiStore = defineStore('ui', () => {
  const theme = ref(storageService.getLastTheme() || 'light');
  const disableAnimations = ref(storageService.getDisableAnimations() ?? false);

  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light';
  }

  function toggleAnimationsDisabled() {
    disableAnimations.value = !disableAnimations.value;
  }

  watch(theme, (newTheme) => {
    storageService.saveLastTheme(newTheme);
    if (newTheme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  });

  watch(disableAnimations, (v) => {
    storageService.saveDisableAnimations(v);
    if (v) {
      document.body.classList.add('reduce-motion');
    } else {
      document.body.classList.remove('reduce-motion');
    }
  }, { immediate: true });

  if (theme.value === 'dark') {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }

  return { theme, toggleTheme, disableAnimations, toggleAnimationsDisabled };
});
