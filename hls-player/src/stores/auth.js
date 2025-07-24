import { defineStore } from 'pinia';
import { ref } from 'vue';
import keycloak from '../services/keycloak';

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false);
  const user = ref(null);
  const isLoading = ref(true);

  function login() {
    keycloak.login();
  }
  
  function notifyAuthStateChanged() {
    import('./station').then(({ useStationStore }) => {
      const stationStore = useStationStore();
      if (stationStore?.onAuthStateChanged) {
        stationStore.onAuthStateChanged();
      }
    }).catch(console.error);
  }

  function logout() {
    keycloak.logout({ redirectUri: window.location.origin });
  }

  async function init() {
    if (isAuthenticated.value) {
      return;
    }
    
    isLoading.value = true;
    try {
      const auth = await keycloak.init({});
      isAuthenticated.value = auth;

      if (auth) {
        user.value = await keycloak.loadUserProfile();
        console.log('Authenticated as:', user.value);
      } else {
        console.log('Not authenticated');
      }
      
      this.notifyAuthStateChanged();
    } catch (error) {
      console.error('Failed to initialize Keycloak:', error);
    } finally {
      isLoading.value = false;
    }
  }

  return {
    isAuthenticated,
    user,
    isLoading,
    login,
    logout,
    init,
    keycloakInstance: keycloak,
    notifyAuthStateChanged
  };
});
