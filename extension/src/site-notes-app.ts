import { SITE_NOTES_APP_MARKER } from "../../shared/bridge-protocol";

/**
 * Enderecos (host:porta) locais de desenvolvimento. Em qualquer outro host a extensao
 * reconhece o app pelo marcador `SITE_NOTES_APP_MARKER` no HTML e registra a origem.
 */
export const SITE_NOTES_APP_ADDRESSES: readonly string[] = [
  "localhost:4200",
  "127.0.0.1:4200",
];

/** Fallback do popup ate a extensao registrar a origem real do app aberto. */
export const DEFAULT_SITE_NOTES_APP_URL = "http://localhost:4200";

const DEFAULT_PORTS: Record<string, string> = { "http:": "80", "https:": "443" };

/** True se o documento atual e o SiteNotes (marcador estatico no <html>). */
export function hasSiteNotesAppMarker(root: Element | null = document.documentElement): boolean {
  return root?.hasAttribute(SITE_NOTES_APP_MARKER) === true;
}

/** Unico criterio por URL (allowlist de dev): injetar/esconder sem depender do marcador. */
export function isSiteNotesAppUrl(rawUrl: string | undefined): boolean {
  if (!rawUrl) {
    return false;
  }

  try {
    const url = new URL(rawUrl);
    const defaultPort = DEFAULT_PORTS[url.protocol];
    return (
      defaultPort !== undefined &&
      SITE_NOTES_APP_ADDRESSES.includes(`${url.hostname}:${url.port || defaultPort}`)
    );
  } catch {
    return false;
  }
}

/** True se a URL pertence a uma origem ja registrada (ex.: http://10.0.0.50:4200). */
export function isRegisteredAppOrigin(
  rawUrl: string | undefined,
  origins: ReadonlySet<string>,
): boolean {
  if (!rawUrl || origins.size === 0) {
    return false;
  }

  try {
    return origins.has(new URL(rawUrl).origin);
  } catch {
    return false;
  }
}

export function isSiteNotesAppTab(
  rawUrl: string | undefined,
  registeredOrigins: ReadonlySet<string>,
): boolean {
  return isSiteNotesAppUrl(rawUrl) || isRegisteredAppOrigin(rawUrl, registeredOrigins);
}
