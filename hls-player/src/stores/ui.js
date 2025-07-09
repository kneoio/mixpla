import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { storageService } from '../services/storage';

export const useUiStore = defineStore('ui', () => {
  const theme = ref(storageService.getLastTheme() || 'light');

  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light';
  }

  watch(theme, (newTheme) => {
    storageService.saveLastTheme(newTheme);
    if (newTheme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  });

  if (theme.value === 'dark') {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }

  return { theme, toggleTheme };
});
