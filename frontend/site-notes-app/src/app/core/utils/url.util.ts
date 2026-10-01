import {
  extractYouTubeVideoId as videoIdFromUrl,
  hostTitle,
  isLocalOrPrivateHost,
  normalizeTitleText,
} from '@sitenotes/shared/url-rules';

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
    return videoIdFromUrl(new URL(rawUrl));
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

    if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.slice(0, -1);
    }

    return url.toString();
  } catch {
    return rawUrl.trim();
  }
}

export function cleanPageTitle(title: string): string {
  return normalizeTitleText(title);
}

export function hostTitleFromUrl(rawUrl: string): string {
  try {
    return hostTitle(new URL(rawUrl.trim())) || rawUrl.trim();
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

    return isLocalOrPrivateHost(url);
  } catch {
    return true;
  }
}
