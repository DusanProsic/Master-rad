import { Injectable, Inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DOCUMENT } from '@angular/common';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'app-theme';
  private themeSubject = new BehaviorSubject<ThemeMode>(this.getInitialTheme());
  theme$ = this.themeSubject.asObservable();

  constructor(@Inject(DOCUMENT) private document: Document) {
    this.applyTheme(this.themeSubject.value);
  }
toggleDarkMode() { this.toggleTheme(); }
  /** Toggle between light and dark mode */
  toggleTheme(): void {
    const current = this.themeSubject.value;
    const next = current === 'light' ? 'dark' : 'light';
    this.setTheme(next);
  }

  /** Set a specific theme */
  setTheme(mode: ThemeMode): void {
    localStorage.setItem(this.storageKey, mode);
    this.themeSubject.next(mode);
    this.applyTheme(mode);
  }

  /** Check if dark mode is active */
  isDarkMode(): boolean {
    return this.themeSubject.value === 'dark';
  }

  /** Apply the theme to the document */
  private applyTheme(mode: ThemeMode): void {
    this.document.documentElement.setAttribute('data-theme', mode);
  }

  /** Get initial theme from localStorage or system preference */
  private getInitialTheme(): ThemeMode {
    const saved = localStorage.getItem(this.storageKey) as ThemeMode | null;
    if (saved) return saved;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }
}
