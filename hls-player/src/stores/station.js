import { defineStore } from 'pinia';
import { storageService } from '../services/storage';
import apiClient, { publicApiClient } from '../services/api';

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
    radioName: '',
    radioSlug: '',
    stationName: '',
    stationColor: null,
    stationInfo: null,
    djName: null,
    djStatus: null,
    nowPlaying: '',
    isAsleep: false,
    isBroadcasting: false,
    isWaitingForCurator: false,
    isWarmingUp: false,
    statusText: 'Loading...',
    pollingInterval: null,
    listPollingInterval: null,
    bufferStatus: {
      level: 0,
      health: 'good'
    },
    track404: false,
    count404: 0,
    segmentStats: {
      total: 0,
      success: 0,
      errors: 0,
      errorRate: 0,
      lastReset: Date.now()
    },
    titleAnimation: {
      type: 'static',
      speed: 1,
      enabled: false
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
    
    
    async fetchStations(skipAutoSelect = false) {
      try {
        const response = await publicApiClient.get('/radio/stations');
        this.stations = response.data;
        
        
        if (!skipAutoSelect) {
          const urlParams = new URLSearchParams(window.location.search);
          const radioParam = urlParams.get('radio');
          
          let targetStationName = this.radioName;
          
          if (radioParam) {
            const stationBySlug = this.stations.find(s => s.slugName === radioParam);
            const stationByName = this.stations.find(s => s.name === radioParam);
            const targetStation = stationBySlug || stationByName;
            
            if (targetStation) {
              targetStationName = targetStation.name;
            } else {
              targetStationName = radioParam;
            }
          }
          
          const stationExists = this.stations.some(s => s.name === targetStationName);

          if (!targetStationName || !stationExists) {
            const realStations = this.stations;
            if (realStations.length > 0) {
              this.statusText = 'Searching for a random online station...';
              const activeStatuses = ['ONLINE', 'BROADCASTING'];
              const onlineStations = realStations.filter(s => activeStatuses.includes(s.currentStatus));
              const pick = onlineStations.length > 0 ? onlineStations[Math.floor(Math.random() * onlineStations.length)] : realStations[0];
              this.radioName = pick.name;
              this.radioSlug = pick.slugName || '';
            }
          } else {
            this.radioName = targetStationName;
            const currentStation = this.stations.find(s => s.name === targetStationName);
            this.radioSlug = currentStation?.slugName || '';
            
            this.stationName = currentStation?.displayName || targetStationName;
            this.stationColor = currentStation?.color || null;
            this.isAsleep = false;
            this.isBroadcasting = false;
            this.isWaitingForCurator = false;
            this.djName = null;
            this.djStatus = null;
            this.nowPlaying = '';
            this.statusText = 'Loading station information...';
            
            
          }
          this.startPolling(); 
          this.startListPolling(); 
        }

        if (skipAutoSelect) {
          const urlParams = new URLSearchParams(window.location.search);
          const radioParam = urlParams.get('radio');
          if (radioParam && !this.radioSlug) {
            const stationBySlug = this.stations.find(s => s.slugName === radioParam);
            const stationByName = this.stations.find(s => s.name === radioParam);
            const targetStation = stationBySlug || stationByName;
            if (targetStation) {
              this.radioName = targetStation.name;
              this.radioSlug = targetStation.slugName || '';
              this.stationName = targetStation.displayName || targetStation.name;
              this.stationColor = targetStation.color || null;
            }
          }
        }

      } catch (error) {
        console.error('Failed to get stations list:', error);
        
        if (error.response?.data?.message && 
            error.response.data.message.includes('"user" is null')) {
          console.log('User is null, silently logging out...');
          
          this.stations = [];
          this.radioName = null;
          this.stationInfo = null;
          this.nowPlaying = '';
          this.statusText = 'Redirecting...';
          this.isAsleep = false;
          this.isWaitingForCurator = false;
          this.isBroadcasting = false;
          
          if (this.statusPollingInterval) {
            clearInterval(this.statusPollingInterval);
            this.statusPollingInterval = null;
          }
          if (this.listPollingInterval) {
            clearInterval(this.listPollingInterval);
            this.listPollingInterval = null;
          }
          
          return;
        }
        
        const urlParams = new URLSearchParams(window.location.search);
        const radioParam = urlParams.get('radio');
        
        if (this.radioName || radioParam) {
          const targetStationName = radioParam || this.radioName;
          
          this.radioName = targetStationName;
          this.radioSlug = radioParam || '';
          this.stationName = this.stationName || targetStationName;
          this.stationColor = this.stationColor || '#6b7280';
          this.isAsleep = false;
          this.isBroadcasting = false;
          this.isWaitingForCurator = false;
          this.djName = null;
          this.djStatus = null;
          this.nowPlaying = '';
          this.statusText = 'Loading station information...';
          
          this.stations = [{
            name: targetStationName,
            displayName: this.stationName,
            color: this.stationColor,
            currentStatus: 'OFFLINE',
            type: 'station'
          }];
          
          this.statusText = 'Limited station list (connection issue).';
          
          
          
          this.startPolling();
          this.startListPolling();
        } else {
          this.statusText = 'Could not load station list.';
        }
      }
    },

    async fetchStationInfo() {
      if (!this.radioSlug) return;
      try {
        const response = await apiClient.get(`/${this.radioSlug}/radio/status`);
        const data = response.data;
        this.stationInfo = data;
        const currentStation = this.stations.find(s => (s.slugName || s.name) === this.radioSlug);
        this.stationName = currentStation?.displayName || this.stationName || data.name || this.radioName;
        this.djName = data.djName;
        this.djStatus = data.djStatus;

        if (data.currentStatus === 'WARMING_UP') {
          this.isAsleep = false;
          this.isBroadcasting = false;
          this.isWaitingForCurator = false;
          this.isWarmingUp = true;
          this.statusText = 'Warming up...';
          return;
        }

        const isOnlineStatus = data.currentStatus === 'ON_LINE' || data.currentStatus === 'QUEUE_SATURATED' || data.currentStatus === 'SYSTEM ERROR';
        
        if (isOnlineStatus && data.currentSong === 'Waiting for curator to start the broadcast...') {
          this.statusText = 'Station is online, waiting for curator...';
          this.isAsleep = false;
          this.isBroadcasting = false;
          this.isWaitingForCurator = true;
          this.isWarmingUp = false;
        } else {
          this.isAsleep = false;
          this.isBroadcasting = isOnlineStatus;
          this.isWaitingForCurator = false;
          this.isWarmingUp = false;
          
          if (data.currentSong && data.currentSong.trim() !== '') {
            this.nowPlaying = data.currentSong;
          }
            
          let displayMessageParts = [];
          if (data.countryCode) displayMessageParts.push(`Country: ${data.countryCode}`);
          if (data.djName) displayMessageParts.push(`DJ: ${data.djName}`);
          if (data.djStatus && data.djStatus !== 'CONTROLLING') displayMessageParts.push('offline');
          this.statusText = displayMessageParts.join(', ');
        }
        
        if (data.color && data.color.match(/^#[0-9a-fA-F]{6,8}$/)) {
          this.stationColor = data.color.length === 9 ? data.color.substring(0, 7) : data.color;
        } else {
          this.stationColor = null;
        }
        
        if (data.animation) {
          this.titleAnimation = {
            type: data.animation.type || 'static',
            speed: data.animation.speed || 1,
            enabled: data.animation.enabled || false
          };
        }
      } catch (error) {
        if (error.response && error.response.status === 404) {
            const responseText = error.response.data;
            if (typeof responseText === 'string' && responseText.includes("Radio station not broadcasting")) {
                this.isAsleep = true;
                this.isBroadcasting = false;
                this.isWaitingForCurator = false;
                this.isWarmingUp = false;
                this.statusText = 'Station is offline.';
                const currentStation = this.stations.find(s => s.name === this.radioName);
                this.stationName = currentStation?.displayName || this.stationName || this.radioName;
                this.stopPolling();
                return;
            }
        }
        console.error(`Failed to fetch station status for ${this.radioName}:`, error);
        this.isAsleep = false;
        this.isWaitingForCurator = false;
        this.isBroadcasting = false;
        this.isWarmingUp = false;
        this.statusText = `Error: Could not fetch station status.`;
      }
    },

    async wakeUpStation() {
        if (!this.radioSlug) return;
        this.statusText = 'Waking up station...';

        try {
            await apiClient.put(`/${this.radioSlug}/radio/wakeup`);
            this.startPolling(); 
        } catch (error) {
            console.error('Error waking up station:', error);
            this.statusText = 'Failed to wake up station.';
        }
    },

    setStation(station) {
      const stationName = typeof station === 'string' ? station : station.name;
      const stationData = typeof station === 'object' ? station : this.stations.find(s => s.name === stationName || s.slugName === stationName);
      
      if (stationName && this.radioName !== stationName) {
        this.radioName = stationName;
        
        if (stationData?.slugName) {
          this.radioSlug = stationData.slugName;
        } else {
          this.radioSlug = stationName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        }
        
        
        this.stationName = stationData?.displayName || stationName;
        this.stationColor = stationData?.color || null;
        this.isAsleep = false;

        this.isWarmingUp = true; 
        this.isBroadcasting = false;
        this.isWaitingForCurator = false;
        this.djName = null;        this.djStatus = null;
        this.nowPlaying = ''; 
        this.statusText = 'Loading station information...';
        
        this.startPolling();
      }
    },

    addCustomStation(station) {
      const existingStation = this.stations.find(s => s.name === station.name);
      if (!existingStation) {
        this.stations.push(station);
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
        this.fetchStations(true);
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
