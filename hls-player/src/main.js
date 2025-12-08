import { createApp } from 'vue';
import './style.css';
import './assets/fonts/fonts.css';
import App from './App.vue';
import naive from 'naive-ui';
import { createPinia } from 'pinia';
import router from './router'; 

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);
app.use(router); 
app.use(naive);

app.mount('#app');

