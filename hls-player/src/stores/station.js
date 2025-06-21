import { defineStore } from 'pinia';

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
    stations: ['sexta', 'aizoo', 'bratan', 'labirints'], // Static list of stations
    radioName: 'sexta', // Default station
    stationInfo: null,
    nowPlaying: 'N/A',
    pollingInterval: null,
    bufferStatus: 'healthy', // 'healthy', 'buffering', 'stalled', 'fatal'
    animationIntensity: 0, // 0 to 1 for animation intensity
    stationColor: null,
    statusText: '',
    stationName: 'Radio',
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
      if (!this.radioName) return; // Don't fetch if no station is selected

      const endpoint = `https://bratan.online/${this.radioName}/radio/status`;
      try {
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }
        const data = await response.json();
        
        this.stationInfo = data;
        this.stationName = data.name || 'Unknown Radio';
        
        
        if (data.color && data.color.match(/^#[0-9a-fA-F]{6}$/)) {
          this.stationColor = data.color;
        } else {
          this.stationColor = null;
        }

        let displayMessageParts = [];
        if (data.managedBy) displayMessageParts.push(`Mode: ${data.managedBy}`);
        if (data.countryCode) displayMessageParts.push(`Country: ${data.countryCode}`);
        if (data.djName) displayMessageParts.push(`DJ: ${data.djName}`);
        if (data.currentStatus) displayMessageParts.push(`${data.currentStatus.replace(/_/g, ' ').toLowerCase()}`);
        this.statusText = displayMessageParts.join(', ');

      } catch (error) {
        console.error(`Failed to fetch station status for ${this.radioName}:`, error);
        this.statusText = `Error: Could not fetch station status.`;
        this.stationName = 'Radio Unavailable';
        this.stationInfo = null;
        this.stationColor = null;
      }
    },

    setStation(newStationName) {
      if (this.stations.includes(newStationName) && this.radioName !== newStationName) {
        this.radioName = newStationName;
        // When station changes, we want to immediately fetch the new info
        this.startPolling();
      }
    },

    startPolling() {
      this.stopPolling(); // Ensure no multiple intervals are running
      this.fetchStationInfo(); // Fetch immediately on start
      // Poll for updates every 15 seconds
      this.pollingInterval = setInterval(() => {
        this.fetchStationInfo();
      }, 15000);
    },

    stopPolling() {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
    },
  },
});
