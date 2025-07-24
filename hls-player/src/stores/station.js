import { defineStore } from 'pinia';
import { storageService } from '../services/storage';
import apiClient, { publicApiClient } from '../services/api';
import { useAuthStore } from '../stores/auth';

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
    stations: [],
    radioName: storageService.getLastStation() || null,
    stationInfo: null,
    nowPlaying: 'N/A',
    statusPollingInterval: null,
    listPollingInterval: null,
    bufferStatus: 'healthy',
    animationIntensity: 0,
    stationColor: null,
    statusText: 'Loading stations...',
    stationName: 'Radio',
    isAsleep: false,
    isWaitingForCurator: false,
    isWarmingUp: false,
    isBroadcasting: false,
    bufferStatus: 'ok',
    djName: null,
    djStatus: null,
    error404: {
      enabled: false,
      count: 0
    },
    segmentErrors: {
      total: 0,
      lastError: null,
      recentErrors: [],
      errorRate: 0,
      lastHour: 0
    },
    segmentStats: {
      total: 0,
      success: 0,
      failed: 0
    }
  }),

  getters: {
    dynamicBorderStyle(state) {
      if (!state.stationColor) return '';
      
      const color = state.stationColor;
      const lightColor = lightenColor(color, 30);
      
      return `
        --station-color: ${color};
        --station-color-light: ${lightColor};
        --station-glow: 0 0 10px ${color}80;
        --station-glow-hover: 0 0 20px ${color}80;
        --station-gradient: linear-gradient(135deg, ${color}, ${lightColor});
      `;
    },
    
    segmentErrorStats(state) {
      const total = state.segmentStats.total || 1;
      const successRate = (state.segmentStats.success / total) * 100;
      
      return {
        totalRequests: state.segmentStats.total,
        successCount: state.segmentStats.success,
        errorCount: state.segmentStats.failed,
        successRate: Math.round(successRate * 100) / 100,
        lastError: state.segmentErrors.lastError,
        errorsLastHour: state.segmentErrors.lastHour,
        errorRate: Math.round(state.segmentErrors.errorRate * 100) / 100
      };
    }
  },

  actions: {
    set404Tracking(enabled) {
      this.error404.enabled = enabled;
    },
    
    track404Error() {
      if (this.error404.enabled) {
        this.error404.count++;
      }
    },
    
    get404Count(reset = false) {
      const count = this.error404.count;
      if (reset) {
        this.error404.count = 0;
      }
      return count;
    },
    trackSegmentLoad(success = true) {
      this.segmentStats.total++;
      if (success) {
        this.segmentStats.success++;
      } else {
        this.segmentStats.failed++;
        
        const errorTime = Date.now();
        this.segmentErrors.total++;
        this.segmentErrors.lastError = errorTime;
        
        const oneHourAgo = errorTime - (60 * 60 * 1000);
        this.segmentErrors.recentErrors = this.segmentErrors.recentErrors
          .filter(time => time > oneHourAgo)
          .concat([errorTime]);
        
        const lastHourErrors = this.segmentErrors.recentErrors.length;
        this.segmentErrors.errorRate = lastHourErrors / 60;
        this.segmentErrors.lastHour = lastHourErrors;
      }
    },
    
    getSegmentErrorStats() {
      return {
        totalErrors: this.segmentErrors.total,
        lastError: this.segmentErrors.lastError,
        errorsLastHour: this.segmentErrors.lastHour,
        errorRate: this.segmentErrors.errorRate,
        successRate: this.segmentStats.total > 0 
          ? (this.segmentStats.success / this.segmentStats.total) * 100 
          : 100
      };
    },
    setBufferStatus(status) {
      if (['healthy', 'ok', 'poor', 'critical', 'stalling', 'fatal'].includes(status)) {
        this.bufferStatus = status;
      }
    },
    
    updateAuthEntry() {
      const authStore = useAuthStore();
      
      this.stations = this.stations.filter(s => s.type !== 'auth');
      
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
    },
    
    onAuthStateChanged() {
      this.updateAuthEntry();
    },
    
    async fetchStations(skipAutoSelect = false) {
      try {
        const response = await publicApiClient.get('/radio/stations');
        this.stations = response.data;
        
        this.updateAuthEntry();
        
        if (!skipAutoSelect) {
          const stationExists = this.stations.some(s => s.name === this.radioName && s.type !== 'auth');

          if (!this.radioName || !stationExists) {
            const realStations = this.stations.filter(s => s.type !== 'auth');
            if (realStations.length > 0) {
              this.radioName = realStations[0].name;
              storageService.saveLastStation(this.radioName);
            }
          }
          this.startPolling(); 
          this.startListPolling(); 
        }

      } catch (error) {
        console.error('Failed to get stations list:', error);
        
        if (error.response?.data?.message && 
            error.response.data.message.includes('"user" is null')) {
          console.log('User is null, silently logging out...');
          
          this.stations = [];
          this.radioName = null;
          this.stationInfo = null;
          this.nowPlaying = 'N/A';
          this.statusText = 'Redirecting...';
          this.isAsleep = false;
          this.isWaitingForCurator = false;
          this.isWarmingUp = false;
          this.isBroadcasting = false;
          
          if (this.statusPollingInterval) {
            clearInterval(this.statusPollingInterval);
            this.statusPollingInterval = null;
          }
          if (this.listPollingInterval) {
            clearInterval(this.listPollingInterval);
            this.listPollingInterval = null;
          }
          
          const authStore = useAuthStore();
          authStore.logout();
          return;
        }
        
        if (this.radioName) {
          console.log('Creating fallback station entry for currently playing:', this.radioName);
          this.stations = [{
            name: this.radioName,
            displayName: this.stationName || this.radioName,
            color: this.stationColor || '#6b7280',
            currentStatus: this.isBroadcasting ? 'ON_LINE' : 'OFFLINE',
            type: 'station'
          }];
          
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
          this.statusText = 'Limited station list (connection issue).';
        } else {
          this.statusText = 'Could not load station list.';
        }
      }
    },

    async fetchStationInfo() {
      if (!this.radioName) return;

      try {
        const response = await apiClient.get(`/${this.radioName}/radio/status`);
        const data = response.data;
        this.stationInfo = data;
        const currentStation = this.stations.find(s => s.name === this.radioName && s.type !== 'auth');
        this.stationName = currentStation?.displayName || data.name || this.radioName;
        this.djName = data.djName;
        this.djStatus = data.djStatus;
        this.isWarmingUp = false;

        if (data.currentStatus === 'ON_LINE' && data.currentSong === 'Waiting for curator to start the broadcast...') {
          this.isWaitingForCurator = true;
          this.statusText = 'Station is online, waiting for curator...';
          this.isAsleep = false;
          this.isBroadcasting = false;
        } else {
          this.isWaitingForCurator = false;
          this.isAsleep = false;
          this.isBroadcasting = data.currentStatus === 'ON_LINE';
          
          if (data.currentSong && data.currentSong.trim() !== '') {
            this.nowPlaying = data.currentSong;
          }
            
          let displayMessageParts = [];
          if (data.managedBy) displayMessageParts.push(`Mode: ${data.managedBy}`);
          if (data.countryCode) displayMessageParts.push(`Country: ${data.countryCode}`);
          if (data.djName) displayMessageParts.push(`DJ: ${data.djName}`);
          if (data.currentStatus) displayMessageParts.push(`${data.currentStatus.replace(/_/g, ' ').toLowerCase()}`);
          this.statusText = displayMessageParts.join(', ');
        }
        
        if (data.color && data.color.match(/^#[0-9a-fA-F]{6,8}$/)) {
          this.stationColor = data.color.length === 9 ? data.color.substring(0, 7) : data.color;
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
                const currentStation = this.stations.find(s => s.name === this.radioName && s.type !== 'auth');
                this.stationName = currentStation?.displayName || this.radioName;
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
        storageService.saveLastStation(newStationName);
        
        this.stationName = newStationName.charAt(0).toUpperCase() + newStationName.slice(1);
        this.stationColor = null; // Reset to neutral color
        this.isAsleep = false;
        this.isWaitingForCurator = false;
        this.isWarmingUp = true; // Set to warming up state for gray color
        this.isBroadcasting = false;
        this.djName = null;
        this.djStatus = null;
        this.nowPlaying = 'Loading...'; 
        this.statusText = 'Loading station information...';
        
        this.startPolling();
      }
    },

    addCustomStation(station) {
      const existingStation = this.stations.find(s => s.name === station.name);
      if (!existingStation) {
        this.stations.push(station);
        console.log(`Added custom station: ${station.name}`);
      }
    },

    removeCustomStation(stationName) {
      this.stations = this.stations.filter(s => s.name !== stationName);
      storageService.removeCustomStation(stationName);
      
      if (this.radioName === stationName) {
        this.setStation(this.stations[0]?.name || null);
      }
    },

    startPolling(fast = false) {
      this.stopPolling(); 
      this.fetchStationInfo(); 
      const fastInterval = parseInt(import.meta.env.VITE_POLLING_INTERVAL_FAST_MS, 10) || 5000;
      const regularInterval = parseInt(import.meta.env.VITE_POLLING_INTERVAL_REGULAR_MS, 10) || 15000;
      const interval = fast ? fastInterval : regularInterval;
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
