/**
 * Portas em que o SiteNotes roda: a do `ng serve` e a padrao de `FRONTEND_HOST_PORT` no Compose.
 * Quem muda a porta do frontend precisa acrescenta-la aqui e gerar a extensao de novo.
 */
export const SITE_NOTES_APP_PORTS: readonly string[] = ["4200"];

export const SITE_NOTES_APP_URL = `http://localhost:${SITE_NOTES_APP_PORTS[0]}`;

const APP_HOSTS = new Set(["localhost", "127.0.0.1"]);
const DEFAULT_PORTS: Record<string, string> = { "http:": "80", "https:": "443" };

/** Unico criterio para "esta aba e o SiteNotes?": injetar a ponte e esconder o app da lista. */
export function isSiteNotesAppUrl(rawUrl: string | undefined): boolean {
  if (!rawUrl) {
    return false;
  }

  try {
    const url = new URL(rawUrl);
    const defaultPort = DEFAULT_PORTS[url.protocol];
    return (
      defaultPort !== undefined &&
      APP_HOSTS.has(url.hostname) &&
      SITE_NOTES_APP_PORTS.includes(url.port || defaultPort)
    );
  } catch {
    return false;
  }
}
