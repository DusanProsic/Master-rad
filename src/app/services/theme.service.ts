import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private darkModeClass = 'dark-mode';

  constructor() {
    // Apply saved theme on load
    const darkMode = localStorage.getItem('darkMode');
    if (darkMode === 'true') {
      document.body.classList.add(this.darkModeClass);
    }
  }

  toggleDarkMode() {
    document.body.classList.toggle(this.darkModeClass);
    const isDark = document.body.classList.contains(this.darkModeClass);
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
      localStorage.setItem('darkMode', 'true');
    } else {
      document.body.classList.remove(this.darkModeClass);
      localStorage.setItem('darkMode', 'false');
    }
  }
}
