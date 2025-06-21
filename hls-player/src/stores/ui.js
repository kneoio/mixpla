import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { storageService } from '../services/storage';

export const useUiStore = defineStore('ui', () => {
  // State: Initialize theme from localStorage or default to 'light'
  const theme = ref(storageService.getLastTheme() || 'light');

  // Action: Function to toggle the theme
  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light';
  }

  // Watcher: Automatically save the theme to localStorage whenever it changes
  watch(theme, (newTheme) => {
    storageService.saveLastTheme(newTheme);
    // Optional: Add/remove a class on the body element if needed for global non-component styles
    if (newTheme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  });

  // Initial body class setup
  if (theme.value === 'dark') {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }

  return { theme, toggleTheme };
});
