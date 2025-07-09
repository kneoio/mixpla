import axios from 'axios';
import keycloak from './keycloak';
import { MIXPLA_APP_HEADER } from '../config/version';

// Authenticated API client for protected endpoints
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
      // Do not logout here, let the calling components decide what to do
      return Promise.reject(error);
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Public API client for endpoints that don't require authentication
const publicApiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'X-Mixpla-App': MIXPLA_APP_HEADER
  }
});

// Export both clients
export default apiClient;
export { publicApiClient };
