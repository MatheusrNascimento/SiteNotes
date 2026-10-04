import { api } from "./browser-api";
import { DEFAULT_SITE_NOTES_APP_URL } from "./site-notes-app";

const STORAGE_KEY = "sitenotes.appOrigins";
const PREFERRED_KEY = "sitenotes.preferredAppOrigin";

const origins = new Set<string>();
let preferredOrigin: string | null = null;
let hydrated = false;

function isHttpOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeOrigin(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

async function persist(): Promise<void> {
  try {
    await api.storage.local.set({
      [STORAGE_KEY]: [...origins],
      [PREFERRED_KEY]: preferredOrigin,
    });
  } catch {
    // storage indisponivel (teste sem mock, permissao ausente): o Set em memoria segue valido.
  }
}

/** Carrega origens persistidas. Idempotente; chamar no boot do background. */
export async function hydrateAppOrigins(): Promise<void> {
  if (hydrated) {
    return;
  }

  hydrated = true;

  try {
    const stored = await api.storage.local.get([STORAGE_KEY, PREFERRED_KEY]);
    const list = stored[STORAGE_KEY];
    if (Array.isArray(list)) {
      for (const item of list) {
        if (typeof item === "string" && isHttpOrigin(item)) {
          origins.add(item);
        }
      }
    }

    const preferred = stored[PREFERRED_KEY];
    if (typeof preferred === "string" && isHttpOrigin(preferred)) {
      preferredOrigin = preferred;
    }
  } catch {
    // Sem storage: so allowlist de dev + registros desta sessao.
  }
}

export function getRegisteredOrigins(): ReadonlySet<string> {
  return origins;
}

export function getPreferredAppUrl(): string {
  return preferredOrigin || DEFAULT_SITE_NOTES_APP_URL;
}

/** Registra a origem do app aberto nesta sessao e persiste para o popup/filtro de abas. */
export async function registerAppOrigin(rawOrigin: string): Promise<string | null> {
  const origin = normalizeOrigin(rawOrigin);
  if (!origin) {
    return null;
  }

  origins.add(origin);
  preferredOrigin = origin;
  await persist();
  return origin;
}

/** Apenas para testes. */
export function resetAppOriginsForTests(): void {
  origins.clear();
  preferredOrigin = null;
  hydrated = false;
}
