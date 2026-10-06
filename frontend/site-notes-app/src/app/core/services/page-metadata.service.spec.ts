import { TestBed } from '@angular/core/testing';
import { hostTitleFromUrl } from '../utils/url.util';
import { BrowserTabsService } from './browser-tabs.service';
import { PageMetadataService } from './page-metadata.service';

describe('PageMetadataService', () => {
  let isAvailable: ReturnType<typeof vi.fn>;
  let resolvePageTitle: ReturnType<typeof vi.fn>;
  let service: PageMetadataService;

  beforeEach(() => {
    isAvailable = vi.fn();
    resolvePageTitle = vi.fn();

    TestBed.configureTestingModule({
      providers: [{ provide: BrowserTabsService, useValue: { isAvailable, resolvePageTitle } }],
    });
    service = TestBed.inject(PageMetadataService);
  });

  it('devolve objeto vazio sem chamar a extensao quando a url e vazia ou so espacos', async () => {
    await expect(service.get('')).resolves.toEqual({ url: '', title: '', source: 'fallback' });
    await expect(service.get('   ')).resolves.toEqual({ url: '', title: '', source: 'fallback' });

    expect(isAvailable).not.toHaveBeenCalled();
    expect(resolvePageTitle).not.toHaveBeenCalled();
  });

  it('host bloqueado devolve source blocked-host sem chamar a extensao', async () => {
    const url = 'http://localhost:3000';

    await expect(service.get(url)).resolves.toEqual({
      url,
      title: hostTitleFromUrl(url),
      source: 'blocked-host',
    });

    expect(isAvailable).not.toHaveBeenCalled();
    expect(resolvePageTitle).not.toHaveBeenCalled();
  });

  it('delega para resolvePageTitle quando a extensao esta disponivel', async () => {
    isAvailable.mockResolvedValue(true);
    resolvePageTitle.mockResolvedValue({
      url: 'https://example.com/',
      title: 'Titulo da pagina',
      source: 'page',
    });

    const result = await service.get('https://example.com');

    expect(isAvailable).toHaveBeenCalled();
    expect(resolvePageTitle).toHaveBeenCalledWith('https://example.com');
    expect(result).toEqual({
      url: 'https://example.com/',
      title: 'Titulo da pagina',
      source: 'page',
    });
  });

  it('cai no fallback por hostname quando a extensao esta indisponivel', async () => {
    isAvailable.mockResolvedValue(false);

    const result = await service.get('https://example.com/post');

    expect(resolvePageTitle).not.toHaveBeenCalled();
    expect(result).toEqual({
      url: 'https://example.com/post',
      title: hostTitleFromUrl('https://example.com/post'),
      source: 'fallback',
    });
  });

  it('cai no fallback por hostname quando a extensao lanca erro', async () => {
    isAvailable.mockRejectedValue(new Error('falhou'));

    const result = await service.get('https://example.com/post');

    expect(resolvePageTitle).not.toHaveBeenCalled();
    expect(result).toEqual({
      url: 'https://example.com/post',
      title: hostTitleFromUrl('https://example.com/post'),
      source: 'fallback',
    });
  });

  it('cai no fallback quando resolvePageTitle lanca erro', async () => {
    isAvailable.mockResolvedValue(true);
    resolvePageTitle.mockRejectedValue(new Error('timeout'));

    const result = await service.get('https://example.com/post');

    expect(result).toEqual({
      url: 'https://example.com/post',
      title: hostTitleFromUrl('https://example.com/post'),
      source: 'fallback',
    });
  });
});
