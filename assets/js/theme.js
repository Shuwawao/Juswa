/**
 * Juswa Portfolio Theme Manager
 * Manages strict monochrome Light and Dark themes.
 * Persists theme state in localStorage under 'juswa-theme'.
 */

class ThemeManager {
  constructor() {
    this.STORAGE_KEY = 'juswa-theme';
    this.currentTheme = this.getSavedTheme();
    this.init();
  }

  getSavedTheme() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    // Check OS preference as intelligent default
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  init() {
    this.applyTheme(this.currentTheme, false);

    // Listen for OS theme changes if user hasn't explicitly set a preference
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(this.STORAGE_KEY)) {
          this.applyTheme(e.matches ? 'dark' : 'light', true);
        }
      });
    }
  }

  applyTheme(theme, playSound = false) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(this.STORAGE_KEY, theme);

    if (playSound && window.JuswaSound) {
      window.JuswaSound.playSwitch();
    }

    // Sync room specific elements if present
    this.syncRoomElements(theme);

    // Dispatch global event
    window.dispatchEvent(new CustomEvent('juswa-theme-change', {
      detail: { theme }
    }));
  }

  toggleTheme() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(newTheme, true);
    return newTheme;
  }

  syncRoomElements(theme) {
    const switchOnImg = document.getElementById('room-switch-on');
    const switchOffImg = document.getElementById('room-switch-off');
    const sunLayer = document.getElementById('room-sun');
    const moonLayer = document.getElementById('room-moon');
    const darkModeOverlay = document.getElementById('room-dark-mode');
    const lightEffectsLayer = document.getElementById('room-light-effects');

    const isDark = theme === 'dark';

    if (switchOnImg && switchOffImg) {
      switchOnImg.style.display = isDark ? 'none' : 'block';
      switchOffImg.style.display = isDark ? 'block' : 'none';
    }

    if (sunLayer && moonLayer) {
      sunLayer.style.opacity = isDark ? '0' : '1';
      moonLayer.style.opacity = isDark ? '1' : '0';
    }

    if (darkModeOverlay) {
      darkModeOverlay.style.opacity = isDark ? '1' : '0';
    }

    if (lightEffectsLayer) {
      lightEffectsLayer.style.opacity = isDark ? '1' : '0';
    }
  }
}

// Global singleton instance
window.JuswaTheme = new ThemeManager();
export default window.JuswaTheme;
