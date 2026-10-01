const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'si',
]);

export function extractYouTubeVideoId(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./i, '').toLowerCase();

    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id || null;
    }

    const youtubeHosts = new Set(['youtube.com', 'm.youtube.com', 'music.youtube.com']);
    if (!youtubeHosts.has(host)) {
      return null;
    }

    const fromQuery = url.searchParams.get('v');
    if (fromQuery) {
      return fromQuery;
    }

    const segments = url.pathname.split('/').filter(Boolean);
    if (
      segments.length >= 2 &&
      (segments[0] === 'shorts' || segments[0] === 'embed' || segments[0] === 'live')
    ) {
      return segments[1];
    }

    return null;
  } catch {
    return null;
  }
}

export function canonicalReferenceUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const videoId = extractYouTubeVideoId(rawUrl);
    if (videoId) {
      return `https://www.youtube.com/watch?v=${videoId}`;
    }

    url.hash = '';
    url.hostname = url.hostname.replace(/^www\./i, '');
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }

    let result = url.toString();
    if (result.endsWith('/') && url.pathname !== '/') {
      result = result.slice(0, -1);
    }

    return result;
  } catch {
    return rawUrl.trim();
  }
}

export function cleanPageTitle(title: string): string {
  return title.replace(/\s+-\s+YouTube$/i, '').replace(/\s+/g, ' ').trim();
}

export function hostTitleFromUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl.trim());
    return url.hostname.replace(/^www\./i, '') || rawUrl.trim();
  } catch {
    return rawUrl.trim();
  }
}

export function isBlockedLookupHost(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return true;
    }

    // URL.hostname devolve literais IPv6 entre colchetes, ex.: "[fd00::1]".
    const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
      return true;
    }

    if (host.includes(':')) {
      return host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:');
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
  } catch {
    return true;
  }
}
