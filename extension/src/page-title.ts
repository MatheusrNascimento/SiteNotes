const PAGE_TITLE_MAX_HTML_BYTES = 512 * 1024;
// Abaixo dos 10 s que o app espera, para o app receber o fallback em vez de um timeout.
const PAGE_TITLE_FETCH_TIMEOUT_MS = 8000;
const PAGE_TITLE_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 SiteNotes/1.0";

export type PageTitleSource = "page" | "youtube" | "fallback" | "blocked-host";

export interface PageTitleResult {
  url: string;
  title: string;
  source: PageTitleSource;
  error?: string;
}

interface PageAddress {
  uri: URL;
  value: string;
  hostTitle: string;
  isBlocked: boolean;
}

export async function resolvePageTitle(rawUrl: unknown): Promise<PageTitleResult> {
  let address: PageAddress;
  try {
    address = createPageAddress(rawUrl);
  } catch (error) {
    return {
      url: String(rawUrl || "").trim(),
      title: String(rawUrl || "").trim(),
      source: "fallback",
      error: errorMessage(error),
    };
  }

  if (address.isBlocked) {
    return {
      url: address.value,
      title: address.hostTitle,
      source: "blocked-host",
    };
  }

  try {
    if (isYouTubeUrl(address.uri)) {
      const youtubeTitle = await tryReadYouTubeTitle(address.uri);
      if (youtubeTitle) {
        return {
          url: address.value,
          title: normalizePageTitle(youtubeTitle),
          source: "youtube",
        };
      }
    }

    const html = await tryReadHtml(address.uri);
    if (html) {
      const htmlTitle = extractHtmlTitle(html);
      if (htmlTitle) {
        return {
          url: address.value,
          title: htmlTitle,
          source: "page",
        };
      }
    }
  } catch {
    // fallback below
  }

  return {
    url: address.value,
    title: address.hostTitle,
    source: "fallback",
  };
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function createPageAddress(raw: unknown): PageAddress {
  const trimmed = String(raw || "").trim();
  let uri: URL;
  try {
    uri = new URL(trimmed);
  } catch {
    throw new Error("Url invalida. Use http ou https.");
  }

  if (uri.protocol !== "http:" && uri.protocol !== "https:") {
    throw new Error("Url invalida. Use http ou https.");
  }

  return {
    uri,
    value: uri.toString(),
    hostTitle: hostTitleFromUri(uri),
    isBlocked: isBlockedHost(uri),
  };
}

export function hostTitleFromUri(uri: URL): string {
  return uri.hostname.replace(/^www\./i, "");
}

function isBlockedHost(uri: URL): boolean {
  // URL.hostname devolve literais IPv6 entre colchetes, ex.: "[fd00::1]".
  const host = uri.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    return true;
  }

  return isPrivateOrLoopbackIp(host);
}

function isPrivateOrLoopbackIp(host: string): boolean {
  if (host === "0.0.0.0") {
    return true;
  }

  if (host.includes(":")) {
    return host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:");
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

function isYouTubeUrl(uri: URL): boolean {
  return Boolean(extractYouTubeVideoIdFromUri(uri));
}

function extractYouTubeVideoIdFromUri(uri: URL): string | null {
  const host = uri.hostname.replace(/^www\./i, "").toLowerCase();

  if (host === "youtu.be") {
    const id = uri.pathname.split("/").filter(Boolean)[0];
    return id || null;
  }

  const youtubeHosts = new Set(["youtube.com", "m.youtube.com", "music.youtube.com"]);
  if (!youtubeHosts.has(host)) {
    return null;
  }

  const fromQuery = uri.searchParams.get("v");
  if (fromQuery) {
    return fromQuery;
  }

  const segments = uri.pathname.split("/").filter(Boolean);
  if (
    segments.length >= 2 &&
    (segments[0] === "shorts" || segments[0] === "embed" || segments[0] === "live")
  ) {
    return segments[1] ?? null;
  }

  return null;
}

async function tryReadYouTubeTitle(uri: URL): Promise<string | null> {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(uri.toString())}&format=json`;
  const response = await fetch(oembedUrl, {
    method: "GET",
    signal: AbortSignal.timeout(PAGE_TITLE_FETCH_TIMEOUT_MS),
    headers: {
      Accept: "application/json",
      "User-Agent": PAGE_TITLE_USER_AGENT,
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload: unknown = await response.json();
  const title = (payload as { title?: unknown } | null)?.title;
  return typeof title === "string" ? title : null;
}

async function tryReadHtml(uri: URL): Promise<string | null> {
  const response = await fetch(uri.toString(), {
    method: "GET",
    signal: AbortSignal.timeout(PAGE_TITLE_FETCH_TIMEOUT_MS),
    headers: {
      Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
      "User-Agent": PAGE_TITLE_USER_AGENT,
    },
  });

  if (!response.ok) {
    return null;
  }

  const mediaType = response.headers.get("content-type") || "";
  if (
    mediaType &&
    !/html/i.test(mediaType) &&
    !/xml/i.test(mediaType) &&
    !/^text\/plain\b/i.test(mediaType)
  ) {
    return null;
  }

  const buffer = await response.arrayBuffer();
  const limited = buffer.byteLength > PAGE_TITLE_MAX_HTML_BYTES
    ? buffer.slice(0, PAGE_TITLE_MAX_HTML_BYTES)
    : buffer;
  const html = new TextDecoder("utf-8", { fatal: false }).decode(limited);
  return html.trim() ? html : null;
}

export function extractHtmlTitle(html: string): string | null {
  const ogTitle = extractMetaContent(html, "og:title");
  if (ogTitle) {
    return normalizePageTitle(ogTitle);
  }

  const twitterTitle = extractMetaContent(html, "twitter:title");
  if (twitterTitle) {
    return normalizePageTitle(twitterTitle);
  }

  const heading = extractFirstHeading(html);
  if (heading) {
    return normalizePageTitle(heading);
  }

  const documentTitle = extractDocumentTitle(html);
  return documentTitle ? normalizePageTitle(documentTitle) : null;
}

function extractMetaContent(html: string, key: string): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<meta\\b[^>]*(?:property|name)\\s*=\\s*["']${escaped}["'][^>]*content\\s*=\\s*["'](?<content>.*?)["'][^>]*/?>|` +
      `<meta\\b[^>]*content\\s*=\\s*["'](?<content2>.*?)["'][^>]*(?:property|name)\\s*=\\s*["']${escaped}["'][^>]*/?>`,
    "is",
  );
  const match = pattern.exec(html);
  if (!match) {
    return null;
  }

  return decodeHtml(match.groups?.["content"] || match.groups?.["content2"] || "");
}

function extractDocumentTitle(html: string): string | null {
  const match = /<title\b[^>]*>(?<title>.*?)<\/title>/is.exec(html);
  return match ? decodeHtml(match.groups?.["title"] ?? "") : null;
}

function extractFirstHeading(html: string): string | null {
  const match = /<h1\b[^>]*>(?<heading>.*?)<\/h1>/is.exec(html);
  if (!match) {
    return null;
  }

  const heading = (match.groups?.["heading"] ?? "").replace(/<.*?>/g, " ");
  return decodeHtml(heading);
}

export function normalizePageTitle(title: unknown): string {
  let decoded = decodeHtml(String(title || "").replace(/\u00a0/g, " ")).trim();
  decoded = decoded.replace(/\s+/g, " ").trim();
  decoded = decoded.replace(/\s+-\s+YouTube$/i, "").trim();
  return decoded;
}

function decodeHtml(value: string): string {
  const textarea = globalThis.document?.createElement?.("textarea");
  if (textarea) {
    textarea.innerHTML = value;
    return textarea.value;
  }

  return String(value)
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
}
