
const LAST_STATION_KEY = 'mixpla_last_station';
const LAST_THEME_KEY = 'mixpla_last_theme';

export const storageService = {
  saveLastStation(stationName) {
    if (typeof stationName === 'string') {
      localStorage.setItem(LAST_STATION_KEY, stationName);
    }
  },

  getLastStation() {
    return localStorage.getItem(LAST_STATION_KEY);
  },

  saveLastTheme(themeName) {
    if (typeof themeName === 'string') {
      localStorage.setItem(LAST_THEME_KEY, themeName);
    }
  },

  getLastTheme() {
    return localStorage.getItem(LAST_THEME_KEY);
  },
};
