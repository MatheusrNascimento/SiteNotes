import {
  canonicalReferenceUrl,
  cleanPageTitle,
  duplicateSearchTerm,
  extractYouTubeVideoId,
  hostTitleFromUrl,
  isBlockedLookupHost,
} from './url.util';

describe('extractYouTubeVideoId', () => {
  it.each([
    ['https://www.youtube.com/watch?v=abc&t=1', 'abc'],
    ['https://youtu.be/abc', 'abc'],
    ['https://youtube.com/shorts/abc', 'abc'],
  ])('reconhece %s', (url, id) => {
    expect(extractYouTubeVideoId(url)).toBe(id);
  });

  it('devolve null para URL invalida ou de outro site', () => {
    expect(extractYouTubeVideoId('nao e url')).toBeNull();
    expect(extractYouTubeVideoId('https://example.com/watch?v=abc')).toBeNull();
  });
});

describe('canonicalReferenceUrl', () => {
  it('reduz variacoes do mesmo video a uma URL', () => {
    const canonical = 'https://www.youtube.com/watch?v=abc';
    expect(canonicalReferenceUrl('https://youtu.be/abc?si=x')).toBe(canonical);
    expect(canonicalReferenceUrl('https://m.youtube.com/watch?v=abc&t=10')).toBe(canonical);
  });

  it('tira www, hash, parametros de rastreio e a barra final', () => {
    expect(
      canonicalReferenceUrl('https://www.example.com/post/?utm_source=x&id=7&fbclid=y#topo'),
    ).toBe('https://example.com/post?id=7');
  });

  it('mantem a barra da raiz e devolve o texto original quando nao e URL', () => {
    expect(canonicalReferenceUrl('https://example.com/')).toBe('https://example.com/');
    expect(canonicalReferenceUrl('  texto  ')).toBe('texto');
  });
});

describe('duplicateSearchTerm', () => {
  it('usa o id do video para que youtu.be e youtube.com caiam na mesma busca', () => {
    expect(duplicateSearchTerm('https://youtu.be/abc')).toBe('abc');
    expect(duplicateSearchTerm('https://www.youtube.com/watch?v=abc')).toBe('abc');
  });

  it('usa o host sem www, que aparece em qualquer variacao da URL', () => {
    const term = duplicateSearchTerm('https://www.Example.com/post/?utm_source=x');
    expect(term).toBe('example.com');
    expect('https://example.com/post'.includes(term)).toBe(true);
  });

  it('cai no texto quando nao e URL', () => {
    expect(duplicateSearchTerm(' algo ')).toBe('algo');
  });
});

describe('isBlockedLookupHost', () => {
  it.each([
    'http://localhost:3000',
    'http://192.168.0.1',
    'http://[fd00::1]/',
    'http://[::1]/',
    'ftp://example.com',
    'nao e url',
  ])('bloqueia %s', (url) => {
    expect(isBlockedLookupHost(url)).toBe(true);
  });

  it.each(['https://facebook.com', 'https://fdroid.org', 'https://fc.example.com'])(
    'libera hosts publicos que comecam com fc/fd/fe (%s)',
    (url) => {
      expect(isBlockedLookupHost(url)).toBe(false);
    },
  );
});

describe('hostTitleFromUrl e cleanPageTitle', () => {
  it('usa o host sem www e cai no texto quando nao e URL', () => {
    expect(hostTitleFromUrl('https://www.example.com/a')).toBe('example.com');
    expect(hostTitleFromUrl(' algo ')).toBe('algo');
  });

  it('limpa espacos e o sufixo do YouTube', () => {
    expect(cleanPageTitle('  Meu   video - YouTube ')).toBe('Meu video');
  });
});
