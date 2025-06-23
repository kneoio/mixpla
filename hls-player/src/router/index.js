import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

import Home from '../views/Home.vue';
import Profile from '../views/Profile.vue';

const routes = [
  { 
    path: '/', 
    name: 'Home',
    component: Home 
  },
  { 
    path: '/profile', 
    name: 'Profile', 
    component: Profile, 
    meta: { requiresAuth: true } 
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // If the route requires auth and the user is not authenticated,
    // redirect to Keycloak login.
    authStore.login();
  } else {
    // Otherwise, allow navigation.
    next();
  }
});

export default router;
