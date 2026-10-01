// Regras de URL usadas pelo app Angular e pela extensao. Sem dependencias e sem APIs de navegador
// alem de `URL`, para rodar no app, no service worker e nos testes.

const YOUTUBE_HOSTS = new Set(['youtube.com', 'm.youtube.com', 'music.youtube.com']);
const YOUTUBE_PATH_PREFIXES = new Set(['shorts', 'embed', 'live']);

export function extractYouTubeVideoId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./i, '').toLowerCase();

  if (host === 'youtu.be') {
    return url.pathname.split('/').filter(Boolean)[0] || null;
  }

  if (!YOUTUBE_HOSTS.has(host)) {
    return null;
  }

  const fromQuery = url.searchParams.get('v');
  if (fromQuery) {
    return fromQuery;
  }

  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length >= 2 && YOUTUBE_PATH_PREFIXES.has(segments[0] ?? '')) {
    return segments[1] ?? null;
  }

  return null;
}

/** Hosts locais ou de rede privada, que nao devem ser buscados para ler o titulo. */
export function isLocalOrPrivateHost(url: URL): boolean {
  // URL.hostname devolve literais IPv6 entre colchetes, ex.: "[fd00::1]".
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
    return true;
  }

  if (host === '0.0.0.0') {
    return true;
  }

  if (host.includes(':')) {
    return (
      host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:')
    );
  }

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const a = Number(ipv4[1]);
    const b = Number(ipv4[2]);
    return (
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      a === 127
    );
  }

  return false;
}

export function hostTitle(url: URL): string {
  return url.hostname.replace(/^www\./i, '');
}

/** Colapsa espacos e tira o sufixo " - YouTube". Nao decodifica entidades HTML. */
export function normalizeTitleText(title: string): string {
  return title
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s+-\s+YouTube$/i, '')
    .trim();
}
