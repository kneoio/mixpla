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
    stations: ['sexta', 'aizoo', 'bratan', 'the-radiola', 'labirints'], // Static list of stations
    radioName: storageService.getLastStation() || 'sexta', // Load last station or default
    stationInfo: null,
    nowPlaying: 'N/A',
    pollingInterval: null,
    bufferStatus: 'healthy', // 'healthy', 'buffering', 'stalled', 'fatal'
    animationIntensity: 0, // 0 to 1 for animation intensity
    stationColor: null,
    statusText: '',
    stationName: 'Radio',
    isAsleep: false, // new state to indicate if station is asleep
    isWaitingForCurator: false, // new state for when station is online but idle
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
    async fetchStationInfo() {
      if (!this.radioName) return;

      const endpoint = `/bratan-api/${this.radioName}/radio/status`;
      try {
        const response = await fetch(endpoint);

        if (!response.ok) {
            if (response.status === 404) {
                const responseText = await response.text();
                console.log(`[Debug] 404 response text: ${responseText}`);
                if (responseText.includes("Radio station not broadcasting")) {
                    console.log('[Debug] Station identified as asleep.');
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
        this.statusText = 'Station is warming up, please wait...';
        const endpoint = `/bratan-api/${this.radioName}/radio/wakeup`;
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
      if (this.stations.includes(newStationName) && this.radioName !== newStationName) {
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
      const interval = fast ? 5000 : 15000; // Poll more frequently if waking up
      // Poll for updates
      this.pollingInterval = setInterval(() => {
        this.fetchStationInfo();
      }, interval);
    },

    stopPolling() {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
    },
  },
});
