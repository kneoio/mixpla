import { defineStore } from 'pinia';
import { storageService } from '../services/storage';

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
    async updateStationsList() {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/radio/stations`);
        if (!response.ok) {
          throw new Error('Failed to fetch stations list');
        }
        this.stations = await response.json();
      } catch (error) {
        console.error('Error updating stations list:', error);
      }
    },

    async fetchStations() {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/radio/stations`);
        if (!response.ok) {
          throw new Error('Failed to fetch stations list');
        }
        this.stations = await response.json();
        const stationExists = this.stations.some(s => s.name === this.radioName);

        if (!this.radioName || !stationExists) {
          if (this.stations.length > 0) {
            this.radioName = this.stations[0].name;
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

      const endpoint = `${import.meta.env.VITE_API_BASE_URL}/${this.radioName}/radio/status`;
      try {
        const response = await fetch(endpoint);

        if (!response.ok) {
            if (response.status === 404) {
                const responseText = await response.text();
                console.log(`[Debug] 404 response text: ${responseText}`);
                if (responseText.includes("Radio station not broadcasting")) {
                    console.log('[Debug] Station identified as asleep.');
                    this.isWarmingUp = false;
                    this.isAsleep = true;
                    this.statusText = 'Station is asleep. Press play to wake it up.';
                    this.stationName = this.radioName;
                    this.stationInfo = null;
                    this.stationColor = '#808080'; // Grey color for asleep state
                    return; // Stop further processing
                }
            }
            // If it's another error or the 404 message doesn't match, throw an error.
            throw new Error(`Server responded with ${response.status}`);
        }
        const data = await response.json();

        this.isWarmingUp = false; // No longer warming up once we get a valid status
        this.isAsleep = false; // Station is awake
        this.stationInfo = data;
        this.stationName = data.name || 'Unknown Radio';

        // Check for WAITING_FOR_CURATOR status
        if (data.currentStatus === 'WAITING_FOR_CURATOR') {
          this.isWaitingForCurator = true;
          this.statusText = 'Station is online, waiting for a curator.';
        } else {
          this.isWaitingForCurator = false;
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
        console.error(`Failed to fetch station status for ${this.radioName}:`, error);
        this.isWarmingUp = false;
        this.isAsleep = false;
        this.isWaitingForCurator = false;
        this.statusText = `Error: Could not fetch station status.`;
        this.stationName = 'Radio Unavailable';
        this.stationInfo = null;
        this.stationColor = null;
      }
    },

    async wakeUpStation() {
        if (!this.radioName) return;
        this.isWarmingUp = true;
        this.statusText = 'Station is warming up, please wait...';
        const endpoint = `${import.meta.env.VITE_API_BASE_URL}/${this.radioName}/radio/wakeup`;
        try {
            const response = await fetch(endpoint, { method: 'PUT' });
            if (!response.ok) {
                throw new Error(`Wake-up call failed with status: ${response.status}`);
            }
            // After sending wakeup, we can start polling for status change
            this.startPolling(true); // fast polling
        } catch (error) {
            console.error('Error waking up station:', error);
            this.statusText = 'Failed to wake up station.';
        }
    },

    setStation(newStationName) {
      if (this.stations.some(s => s.name === newStationName) && this.radioName !== newStationName) {
        this.radioName = newStationName;
        storageService.saveLastStation(newStationName); // Save to local storage
        this.isAsleep = false; // Reset asleep status on station change
        this.isWaitingForCurator = false; // Reset waiting status on station change
        // When station changes, we want to immediately fetch the new info
        this.startPolling();
      }
    },

    startPolling(fast = false) {
      this.stopPolling(); // Ensure no multiple intervals are running
      this.fetchStationInfo(); // Fetch immediately on start
      const interval = fast ? 5000 : 30000; // Poll more frequently if waking up, otherwise every 30s
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
      this.listPollingInterval = setInterval(() => {
        this.updateStationsList();
      }, 60000); // every 60 seconds
    },

    stopListPolling() {
      if (this.listPollingInterval) {
        clearInterval(this.listPollingInterval);
        this.listPollingInterval = null;
      }
    },
  },
});
