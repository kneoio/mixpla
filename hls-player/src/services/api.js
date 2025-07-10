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

export const sendMessage = async (message, brand = 'aizoo') => {
  try {
    const token = keycloak.token;
    if (!token) {
      throw new Error('No authentication token available');
    }
    
    const payload = JSON.parse(atob(token.split('.')[1]));
    const sender = payload.preferred_username || payload.username || payload.sub;
    
    if (!sender) {
      throw new Error('Unable to extract username from token');
    }
    
    const response = await apiClient.post('/api/memories/', {
      brand: brand,
      memoryType: 'INSTANT_MESSAGE',
      content: {
        message: message,
        sender: sender
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Failed to send message:', error);
    throw error;
  }
};

export default apiClient;
export { publicApiClient };
