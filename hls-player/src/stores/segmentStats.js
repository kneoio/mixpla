import { defineStore } from 'pinia';

export const useSegmentStatsStore = defineStore('segmentStats', {
  state: () => ({
    totalSegments: 0,
    successfulSegments: 0,
    failedSegments: 0,
    lastError: null,
    lastErrorTime: null,
    segmentDurations: [],
    segmentLoadTimes: [],
    lastSegmentUrl: null,
    lastSegmentTime: null,
    lastSegmentSize: null,
    lastSegmentType: null,
    segmentErrors: [],
  }),

  getters: {
    successRate: (state) => {
      if (state.totalSegments === 0) return 100;
      return Math.round((state.successfulSegments / state.totalSegments) * 100);
    },
    averageLoadTime: (state) => {
      if (state.segmentLoadTimes.length === 0) return 0;
      const sum = state.segmentLoadTimes.reduce((a, b) => a + b, 0);
      return (sum / state.segmentLoadTimes.length).toFixed(2);
    },
    errorRate: (state) => {
      if (state.totalSegments === 0) return 0;
      return Math.round((state.failedSegments / state.totalSegments) * 100);
    },
  },

  actions: {
    addSegmentRequest(segment) {
      this.totalSegments++;
      this.lastSegmentUrl = segment.url;
      this.lastSegmentTime = new Date();
      this.lastSegmentType = segment.type || 'unknown';
      segment.startTime = performance.now();
    },

    addSegmentSuccess(segment, response) {
      const loadTime = performance.now() - segment.startTime;
      this.successfulSegments++;
      this.segmentLoadTimes.push(loadTime);
      this.lastSegmentSize = response?.length || 0;
      
      if (this.segmentLoadTimes.length > 100) {
        this.segmentLoadTimes.shift();
      }
    },

    addSegmentError(segment, error) {
      this.failedSegments++;
      const errorTime = new Date();
      this.lastError = {
        time: errorTime,
        url: segment.url,
        error: error?.message || 'Unknown error',
        status: error?.response?.status,
      };
      this.lastErrorTime = errorTime;
      
      this.segmentErrors.unshift({
        ...this.lastError,
        type: segment.type || 'unknown',
      });
      if (this.segmentErrors.length > 20) {
        this.segmentErrors.pop();
      }
    },

    resetStats() {
      this.totalSegments = 0;
      this.successfulSegments = 0;
      this.failedSegments = 0;
      this.segmentDurations = [];
      this.segmentLoadTimes = [];
      this.lastError = null;
      this.lastErrorTime = null;
      this.lastSegmentUrl = null;
      this.lastSegmentTime = null;
      this.lastSegmentSize = null;
      this.lastSegmentType = null;
      this.segmentErrors = [];
    },
  },
});
