import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private darkModeClass = 'dark-mode';

  constructor() {
    this.applyInitialTheme();
  }

  private applyInitialTheme() {
    const savedTheme = localStorage.getItem('darkMode');

    if (savedTheme !== null) {
      // Use saved user preference
      this.setDarkMode(savedTheme === 'true');
    } else {
      // Auto-detect from system
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.setDarkMode(prefersDark);
    }
  }

  toggleDarkMode() {
    document.body.classList.toggle(this.darkModeClass);
    const isDark = this.isDarkMode();
    localStorage.setItem('darkMode', isDark ? 'true' : 'false');
  }

  isDarkMode(): boolean {
    return document.body.classList.contains(this.darkModeClass);
  }

  getCurrentTheme(): string {
    return this.isDarkMode() ? 'Dark' : 'Light';
  }

  setDarkMode(enabled: boolean) {
    if (enabled) {
      document.body.classList.add(this.darkModeClass);
    } else {
      document.body.classList.remove(this.darkModeClass);
    }
    localStorage.setItem('darkMode', enabled ? 'true' : 'false');
  }
}
