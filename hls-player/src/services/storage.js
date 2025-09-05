
const LAST_STATION_KEY = 'mixpla_last_station';
const LAST_THEME_KEY = 'mixpla_last_theme';
const DISABLE_ANIM_KEY = 'mixpla_disable_animations';

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

  saveDisableAnimations(disabled) {
    localStorage.setItem(DISABLE_ANIM_KEY, disabled ? '1' : '0');
  },

  getDisableAnimations() {
    const v = localStorage.getItem(DISABLE_ANIM_KEY);
    if (v === null) return null;
    return v === '1';
  },
};
