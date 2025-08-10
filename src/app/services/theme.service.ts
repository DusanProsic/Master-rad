import { Injectable, Inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DOCUMENT } from '@angular/common';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private key = 'app-theme';
  private subject = new BehaviorSubject<ThemeMode>(this.readInitial());
  theme$ = this.subject.asObservable();

  constructor(@Inject(DOCUMENT) private doc: Document) {
    this.apply(this.subject.value);
  }

  /** Use this everywhere */
  toggleDarkMode() {
    const next: ThemeMode = this.subject.value === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  }

  setTheme(mode: ThemeMode) {
    localStorage.setItem(this.key, mode);
    this.subject.next(mode);
    this.apply(mode);
  }

  isDarkMode(): boolean {
    return this.subject.value === 'dark';
  }

  private apply(mode: ThemeMode) {
    this.doc.documentElement.setAttribute('data-theme', mode === 'dark' ? 'dark' : 'light');
  }

  private readInitial(): ThemeMode {
    const saved = localStorage.getItem(this.key) as ThemeMode | null;
    if (saved) return saved;
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }
}
