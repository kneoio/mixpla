import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import naive from 'naive-ui';
import { createPinia } from 'pinia';
import router from './router'; // Import the router
import { useAuthStore } from './stores/auth';

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);
app.use(router); // Use the router
app.use(naive);

const authStore = useAuthStore();

// Initialize the auth store, which will handle Keycloak initialization
authStore.init().then(() => {
  // Make the auth store available globally, which is more idiomatic for Pinia
  app.config.globalProperties.$auth = authStore;
  app.mount('#app');
}).catch(error => {
  console.error("Failed to initialize authentication:", error);
  // Still mount the app so it's usable even if auth fails
  app.mount('#app');
});

