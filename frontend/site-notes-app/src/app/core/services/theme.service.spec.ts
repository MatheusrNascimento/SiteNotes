import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

const THEME_STORAGE_KEY = 'sitenotes.theme';

function stubMatchMedia(matches: boolean): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(window, 'matchMedia').mockReturnValue({ matches } as MediaQueryList);
}

describe('ThemeService', () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    vi.restoreAllMocks();
  });

  it('usa o tema salvo no localStorage quando presente, sem consultar matchMedia', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const matchMedia = stubMatchMedia(false);

    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('dark');
    expect(matchMedia).not.toHaveBeenCalled();
  });

  it('cai no prefers-color-scheme quando nao ha nada salvo e o sistema prefere escuro', () => {
    stubMatchMedia(true);

    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('dark');
    expect(service.isDark()).toBe(true);
  });

  it('cai em light quando nao ha nada salvo e o sistema nao prefere escuro', () => {
    stubMatchMedia(false);

    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('light');
    expect(service.isDark()).toBe(false);
  });

  it('toggle alterna o tema e persiste no localStorage', () => {
    stubMatchMedia(false);
    const service = TestBed.inject(ThemeService);

    service.toggle();
    expect(service.theme()).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    service.toggle();
    expect(service.theme()).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('setTheme grava data-theme no documentElement e persiste no localStorage', () => {
    stubMatchMedia(false);
    const service = TestBed.inject(ThemeService);

    service.setTheme('dark');

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });
});
