import { defineStore } from 'pinia';
import apiClient from '../services/api'; // Use our configured axios instance
const STATUS_PATH_SUFFIX = '/radio/status';
const STATUS_REFRESH_INTERVAL = 15000;

export const useRadioStatusStore = defineStore('radioStatus', {
  state: () => ({
    statusData: {},
    isLoading: false,
    error: null,
    stationName: 'Mixpla',
    pollingInterval: null,
  }),

  getters: {
    displayMessage(state) {
      if (state.error) return `Error: ${state.error}`;
      if (state.isLoading) return 'Fetching status...';
      if (!state.statusData.name) return 'Initializing...';

      const { managedBy, countryCode, djName, djPreferredLang, currentStatus } = state.statusData;
      let parts = [];
      if (managedBy) parts.push(`Mode: ${managedBy}`);
      if (countryCode) parts.push(`Country: ${countryCode}`);
      if ((managedBy === 'AI_AGENT' || managedBy === 'MIX') && djName) {
        let djInfo = `DJ: ${djName}`;
        if (djPreferredLang) djInfo += ` (${djPreferredLang})`;
        parts.push(djInfo);
      }
      if (currentStatus) {
        parts.push(currentStatus.replace(/_/g, ' ').toLowerCase());
      }
      return parts.join(', ') || 'Status information available.';
    },
    borderColor(state) {
        if (state.error || !state.statusData.color) return '';
        return state.statusData.color.match(/^#[0-9a-fA-F]{6}$/) ? state.statusData.color : '';
    }
  },

  actions: {
    async fetchStatus(radioName) {
      if (!radioName) {
        this.error = `Missing URL parameter for the radio station.`;
        return;
      }

      this.isLoading = true;
      this.error = null;

      try {
                const response = await apiClient.get(`/${radioName}${STATUS_PATH_SUFFIX}`);
        this.statusData = response.data;
        this.stationName = response.data.name || 'Unknown Radio';
      } catch (err) {
        this.error = err.response ? `Server Error ${err.response.status}` : `Network Error: ${err.message}`;
        this.statusData = {};
        this.stationName = 'Radio Unavailable';
      } finally {
        this.isLoading = false;
      }
    },

    startPolling(radioName) {
      // Clear any existing polling interval
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
      }

      if (radioName) {
        // Fetch immediately
        this.fetchStatus(radioName);
        // Then set up the interval
        this.pollingInterval = setInterval(() => {
          this.fetchStatus(radioName);
        }, STATUS_REFRESH_INTERVAL);
      } else {
        this.error = 'No radio station specified.';
        this.stationName = 'Radio Not Found';
      }
    },

    stopPolling() {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
    },
  },
});
