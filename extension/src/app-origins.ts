import { api } from "./browser-api";
import { DEFAULT_SITE_NOTES_APP_URL } from "./site-notes-app";

const STORAGE_KEY = "sitenotes.appOrigins";
const PREFERRED_KEY = "sitenotes.preferredAppOrigin";

const origins = new Set<string>();
let preferredOrigin: string | null = null;
let hydratePromise: Promise<void> | null = null;

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

/**
 * Carrega origens persistidas. Idempotente; chamar no boot do background.
 *
 * Retorna a mesma Promise em chamadas concorrentes para que `registerAppOrigin` possa
 * aguardar a leitura do storage terminar antes de mutar o Set e persistir — caso contrario
 * um `persist()` disparado durante a leitura sobrescreveria o storage so com a origem nova,
 * perdendo as origens de sessoes anteriores (a leitura so faz merge em memoria, nunca
 * re-persiste o que achou).
 */
export function hydrateAppOrigins(): Promise<void> {
  if (!hydratePromise) {
    hydratePromise = doHydrate();
  }

  return hydratePromise;
}

async function doHydrate(): Promise<void> {
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

  // Garante que as origens ja persistidas foram carregadas antes de mutar o Set: senao o
  // persist() abaixo sobrescreveria o storage so com `origin`, perdendo o historico.
  await hydrateAppOrigins();

  origins.add(origin);
  preferredOrigin = origin;
  await persist();
  return origin;
}

/** Apenas para testes. */
export function resetAppOriginsForTests(): void {
  origins.clear();
  preferredOrigin = null;
  hydratePromise = null;
}
