import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import naive from 'naive-ui';
import { createPinia } from 'pinia';
import router from './router'; 
import { useAuthStore } from './stores/auth';

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);
app.use(router); 
app.use(naive);

const authStore = useAuthStore();
authStore.init().then(() => {
  app.config.globalProperties.$auth = authStore;
  app.mount('#app');
}).catch(error => {
  console.error("Failed to initialize authentication:", error);
  app.mount('#app');
});

