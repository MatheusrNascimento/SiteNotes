import {
  getPreferredAppUrl,
  getRegisteredOrigins,
  hydrateAppOrigins,
  registerAppOrigin,
} from "./app-origins";
import { api } from "./browser-api";
import { errorMessage, normalizePageTitle, resolvePageTitle } from "./page-title";
import { isSiteNotesAppTab } from "./site-notes-app";

type Tab = chrome.tabs.Tab;

interface RuntimeRequest {
  type?: string;
  url?: unknown;
  origin?: unknown;
}

void hydrateAppOrigins();

// Retornar uma Promise do listener responde a mensagem (Firefox e Chrome 99+).
const onRuntimeMessage = (message: RuntimeRequest | undefined): Promise<unknown> | undefined => {
  if (message?.type === "GET_OPEN_TABS") {
    return collectOpenTabs();
  }

  if (message?.type === "RESOLVE_PAGE_TITLE") {
    return resolvePageTitle(message.url).catch((error: unknown) => ({
      url: String(message.url || "").trim(),
      title: String(message.url || "").trim(),
      source: "fallback",
      error: errorMessage(error),
    }));
  }

  if (message?.type === "REGISTER_APP_ORIGIN") {
    return registerAppOrigin(String(message.origin || "")).then((origin) => ({ origin }));
  }

  if (message?.type === "GET_APP_URL") {
    return Promise.resolve({ url: getPreferredAppUrl() });
  }

  return undefined;
};

api.runtime.onMessage.addListener(onRuntimeMessage as Parameters<typeof api.runtime.onMessage.addListener>[0]);

watchSiteNotesTabs();

async function collectOpenTabs() {
  try {
    await hydrateAppOrigins();
    const tabs = await queryHttpTabs();
    const openTabs = tabs
      .filter(isUsefulTab)
      .sort(compareTabs)
      .map((tab) => ({
        id: tab.id,
        windowId: tab.windowId,
        title: cleanTitle(tab.title || tab.url || ""),
        url: tab.url,
        favIconUrl: tab.favIconUrl || "",
        active: Boolean(tab.active),
      }));

    return { tabs: openTabs };
  } catch (error) {
    return { tabs: [], error: String(error) };
  }
}

async function queryHttpTabs(): Promise<Tab[]> {
  try {
    const matching = await api.tabs.query({ url: ["http://*/*", "https://*/*"] });
    if (matching.length > 0) {
      return matching;
    }
  } catch {
    // Firefox pode recusar o filtro de URL se a permissao de host ainda nao foi concedida.
  }

  return api.tabs.query({});
}

function isUsefulTab(tab: Tab): boolean {
  if (!tab.url) {
    return false;
  }

  try {
    const url = new URL(tab.url);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      !isSiteNotesAppTab(tab.url, getRegisteredOrigins())
    );
  } catch {
    return false;
  }
}

function compareTabs(a: Tab, b: Tab): number {
  if (a.active !== b.active) {
    return a.active ? -1 : 1;
  }

  return (b.lastAccessed || 0) - (a.lastAccessed || 0);
}

function cleanTitle(title: string): string {
  return normalizePageTitle(title);
}

async function injectContentScript(tabId: number): Promise<void> {
  try {
    await api.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
  } catch {
    // Aba fechada no meio, pagina de erro ou sem permissao de host: o content script declarado
    // no manifest continua cobrindo o carregamento normal.
  }
}

function watchSiteNotesTabs(): void {
  api.tabs.onUpdated.addListener((tabId, info, tab) => {
    const url = info.url || tab.url;
    if (!isSiteNotesAppTab(url, getRegisteredOrigins())) {
      return;
    }

    if (info.status === "loading" || info.status === "complete" || info.url) {
      void injectContentScript(tabId);
    }
  });

  void hydrateAppOrigins().then(() =>
    api.tabs
      .query({})
      .then((tabs) => {
        for (const tab of tabs) {
          if (tab.id && isSiteNotesAppTab(tab.url, getRegisteredOrigins())) {
            void injectContentScript(tab.id);
          }
        }
      })
      .catch((error: unknown) => {
        console.warn("SiteNotes: nao foi possivel listar as abas ao iniciar.", error);
      }),
  );
}
