/**
 * Enderecos (host:porta) em que o SiteNotes roda: o `ng serve` / Compose local na 4200 e o
 * servidor da rede local atras do nginx na 80. Quem publicar o app em outro endereco precisa
 * acrescenta-lo aqui e em `content_scripts.matches` do manifest base, e gerar a extensao de novo.
 */
export const SITE_NOTES_APP_ADDRESSES: readonly string[] = [
  "localhost:4200",
  "127.0.0.1:4200",
  "10.0.0.50:80",
  "sitenotes:80",
];

export const SITE_NOTES_APP_URL = "http://10.0.0.50";

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
      SITE_NOTES_APP_ADDRESSES.includes(`${url.hostname}:${url.port || defaultPort}`)
    );
  } catch {
    return false;
  }
}
