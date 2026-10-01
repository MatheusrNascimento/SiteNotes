import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

/** O script inline de src/index.html le a mesma chave; altere os dois juntos. */
const THEME_STORAGE_KEY = 'sitenotes.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<ThemeMode>(this.resolveInitialTheme());

  constructor() {
    this.apply(this.theme());
  }

  isDark(): boolean {
    return this.theme() === 'dark';
  }

  toggle(): void {
    this.setTheme(this.isDark() ? 'light' : 'dark');
  }

  setTheme(mode: ThemeMode): void {
    this.theme.set(mode);
    this.apply(mode);
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  }

  private resolveInitialTheme(): ThemeMode {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private apply(mode: ThemeMode): void {
    document.documentElement.setAttribute('data-theme', mode);
  }
}
