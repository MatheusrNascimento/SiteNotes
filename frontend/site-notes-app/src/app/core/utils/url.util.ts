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
