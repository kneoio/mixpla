import { defineStore } from 'pinia';
import { storageService } from '../services/storage';
import apiClient from '../services/api';
import { useAuthStore } from '../stores/auth';

// Helper function to lighten/darken a hex color
const lightenColor = (hex, percent) => {
    if (!hex || !hex.startsWith('#')) return hex;
    const num = parseInt(hex.substring(1), 16),
          amt = Math.round(2.55 * percent),
          R = (num >> 16) + amt,
          G = (num >> 8 & 0x00FF) + amt,
          B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
};

export const useStationStore = defineStore('station', {
  state: () => ({
    animationIntensity: 0,
    stations: [], // Will be fetched from API
    radioName: storageService.getLastStation() || null, // Load last station or default, will be set after fetch
    stationInfo: null,
    nowPlaying: 'N/A',
    statusPollingInterval: null,
    listPollingInterval: null,
    bufferStatus: 'healthy', // 'healthy', 'buffering', 'stalled', 'fatal'
    animationIntensity: 0, // 0 to 1 for animation intensity
    stationColor: null,
    statusText: 'Loading stations...',
    stationName: 'Radio',
    isAsleep: false, // new state to indicate if station is asleep
    isWaitingForCurator: false, // new state for when station is online but idle
    isWarmingUp: false,
    isBroadcasting: false,
    bufferStatus: 'ok', // ok, stalling, fatal,
    djName: null,
    djStatus: null,
  }),

  getters: {
    dynamicBorderStyle(state) {
      if (!state.stationColor) {
        return {};
      }
      const color = state.stationColor;
      const hex = color.substring(1);
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return {
        '--dynamic-border-color': color,
        '--dynamic-border-color-alt': lightenColor(color, -0.2),
        '--dynamic-border-rgb': `${r}, ${g}, ${b}`,
      };
    },
  },

  actions: {
    setBufferStatus(status) {
      if (['ok', 'stalling', 'fatal'].includes(status)) {
        this.bufferStatus = status;
      }
    },
    async updateStationsList() {
      try {
        const response = await apiClient.get('/radio/stations');
        this.stations = response.data;
      } catch (error) {
        console.error('Error updating stations list:', error);
      }
    },

    async fetchStations() {
      try {
        const response = await apiClient.get('/radio/stations');
        this.stations = response.data;
        
        const authStore = useAuthStore();
        const authEntry = authStore.isAuthenticated ? 
          {
            name: 'logout',
            displayName: 'Logout',
            type: 'auth',
            color: '#ef4444',
            currentStatus: 'STATIC'
          } : 
          {
            name: 'login',
            displayName: 'Login',
            type: 'auth',
            color: '#6b7280',
            currentStatus: 'STATIC'
          };
        
        this.stations.push(authEntry);
        
        const stationExists = this.stations.some(s => s.name === this.radioName && s.type !== 'auth');

        if (!this.radioName || !stationExists) {
          const realStations = this.stations.filter(s => s.type !== 'auth');
          if (realStations.length > 0) {
            this.radioName = realStations[0].name;
            storageService.saveLastStation(this.radioName);
          }
        }
        // Always start polling after fetching stations, it will use the correct radioName
        this.startPolling(); // Start polling for the selected station
        this.startListPolling(); // Start polling for the whole list

      } catch (error) {
        console.error('Error fetching stations:', error);
        this.statusText = 'Could not load station list.';
      }
    },

    async fetchStationInfo() {
      if (!this.radioName) return;

      try {
        const response = await apiClient.get(`/${this.radioName}/radio/status`);
        const data = response.data;
        this.stationInfo = data;
        this.stationName = data.name || this.radioName;
        this.djName = data.djName;
        this.djStatus = data.djStatus;
        this.isWarmingUp = false; // Stop warming up on successful fetch

        if (data.currentStatus === 'ON_LINE' && data.currentSong === 'Waiting for curator to start the broadcast...') {
          this.isWaitingForCurator = true;
          this.statusText = 'Station is online, waiting for curator...';
          this.isAsleep = false;
          this.isBroadcasting = false;
        } else {
          this.isWaitingForCurator = false;
          this.isAsleep = false;
          this.isBroadcasting = data.currentStatus === 'ON_LINE';
          this.nowPlaying = data.currentSong || 'N/A';
          // Construct the status text from other data if not waiting
          let displayMessageParts = [];
          if (data.managedBy) displayMessageParts.push(`Mode: ${data.managedBy}`);
          if (data.countryCode) displayMessageParts.push(`Country: ${data.countryCode}`);
          if (data.djName) displayMessageParts.push(`DJ: ${data.djName}`);
          if (data.currentStatus) displayMessageParts.push(`${data.currentStatus.replace(/_/g, ' ').toLowerCase()}`);
          this.statusText = displayMessageParts.join(', ');
        }
        
        if (data.color && data.color.match(/^#[0-9a-fA-F]{6}$/)) {
          this.stationColor = data.color;
        } else {
          this.stationColor = null;
        }
      } catch (error) {
        if (error.response && error.response.status === 404) {
            const responseText = error.response.data;
            if (typeof responseText === 'string' && responseText.includes("Radio station not broadcasting")) {
                console.log('[Debug] Station identified as asleep.');
                this.isWarmingUp = false;
                this.isAsleep = true;
                this.isBroadcasting = false;
                this.statusText = 'Station is asleep. Click to wake it up.';
                this.stationName = this.radioName;
                this.stopPolling();
                return;
            }
        }
        console.error(`Failed to fetch station status for ${this.radioName}:`, error);
        this.isWarmingUp = false;
        this.isAsleep = false;
        this.isWaitingForCurator = false;
        this.isBroadcasting = false;
        this.statusText = `Error: Could not fetch station status.`;
      }
    },

    async wakeUpStation() {
        if (!this.radioName) return;
        this.isWarmingUp = true;
        this.statusText = 'Station is warming up, please wait...';

        setTimeout(() => {
            if (this.isWarmingUp) {
                this.isWarmingUp = false;
            }
        }, 10000);

        try {
            await apiClient.put(`/${this.radioName}/radio/wakeup`);
            this.startPolling(true); // fast polling
        } catch (error) {
            console.error('Error waking up station:', error);
            this.isWarmingUp = false;
            this.statusText = 'Failed to wake up station.';
        }
    },

    setStation(newStationName) {
      if (this.stations.some(s => s.name === newStationName && s.type !== 'auth') && this.radioName !== newStationName) {
        this.radioName = newStationName;
        storageService.saveLastStation(newStationName); // Save to local storage
        this.isAsleep = false; // Reset asleep status on station change
        this.isWaitingForCurator = false; // Reset waiting status on station change
        this.djName = null;
        this.djStatus = null;
        // When station changes, we want to immediately fetch the new info
        this.startPolling();
      }
    },

    addCustomStation(station) {
      // Check if station already exists
      const existingStation = this.stations.find(s => s.name === station.name);
      if (!existingStation) {
        this.stations.push(station);
        console.log(`Added custom station: ${station.name}`);
      }
    },

    removeCustomStation(stationName) {
      const index = this.stations.findIndex(s => s.name === stationName && s.type === 'custom');
      if (index !== -1) {
        this.stations.splice(index, 1);
        console.log(`Removed custom station: ${stationName}`);
        
        // If we're currently on this station, switch to the first available station
        if (this.radioName === stationName) {
          const realStations = this.stations.filter(s => s.type !== 'auth' && s.type !== 'custom');
          if (realStations.length > 0) {
            this.radioName = realStations[0].name;
            storageService.saveLastStation(this.radioName);
            this.startPolling();
          }
        }
      }
    },

    startPolling(fast = false) {
      this.stopPolling(); // Ensure no multiple intervals are running
      this.fetchStationInfo(); // Fetch immediately on start
      const fastInterval = parseInt(import.meta.env.VITE_POLLING_INTERVAL_FAST_MS, 10) || 5000;
      const regularInterval = parseInt(import.meta.env.VITE_POLLING_INTERVAL_REGULAR_MS, 10) || 15000;
      const interval = fast ? fastInterval : regularInterval;
      // Poll for updates
      this.statusPollingInterval = setInterval(() => {
        this.fetchStationInfo();
      }, interval);
    },

    stopPolling() {
      if (this.statusPollingInterval) {
        clearInterval(this.statusPollingInterval);
        this.statusPollingInterval = null;
      }
    },

    startListPolling() {
      this.stopListPolling(); // prevent duplicates
      const listInterval = parseInt(import.meta.env.VITE_POLLING_INTERVAL_LIST_MS, 10) || 60000;
      this.listPollingInterval = setInterval(() => {
        this.updateStationsList();
      }, listInterval);
    },

    stopListPolling() {
      if (this.listPollingInterval) {
        clearInterval(this.listPollingInterval);
        this.listPollingInterval = null;
      }
    },
  },
});
