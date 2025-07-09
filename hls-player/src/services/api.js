import axios from 'axios';
import keycloak from './keycloak';
import { MIXPLA_APP_HEADER } from '../config/version';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'X-Mixpla-App': MIXPLA_APP_HEADER
  }
});

apiClient.interceptors.request.use(async (config) => {
  if (keycloak.authenticated) {
    try {
      // Set a minimum validity of 30 seconds
      await keycloak.updateToken(30);
      config.headers.Authorization = `Bearer ${keycloak.token}`;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return Promise.reject(error);
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

const publicApiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'X-Mixpla-App': MIXPLA_APP_HEADER
  }
});

export default apiClient;
export { publicApiClient };
