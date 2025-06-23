import axios from 'axios';
import keycloak from './keycloak';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
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

export default apiClient;
