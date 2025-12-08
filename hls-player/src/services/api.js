import axios from 'axios';
import { MIXPLA_APP_HEADER } from '../config/version';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'X-Mixpla-App': MIXPLA_APP_HEADER
  }
});

// No auth interceptors; authentication disabled

const publicApiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'X-Mixpla-App': MIXPLA_APP_HEADER
  }
});

export const sendMessage = async (message, brand = 'aizoo') => {
  try {
    const sender = 'anonymous';
    const response = await publicApiClient.post('/api/memories/', {
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

export const rateTrack = async (brand, trackId, action, previousAction = null) => {
  const body = { action };
  if (previousAction) {
    body.previousAction = previousAction;
  }
  const response = await apiClient.patch(`/radio/${brand}/${trackId}/rating`, body, {
    headers: {
      'X-Client-ID': 'mixpla-web'
    }
  });
  return response.data;
};

export default apiClient;
export { publicApiClient };
