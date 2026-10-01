import { api } from "./browser-api";
import { errorMessage } from "./page-title";

declare global {
  var __sitenotesContentLoaded: boolean | undefined;
}

interface AppRequest {
  source?: string;
  type?: string;
  requestId?: string;
  url?: string;
}

interface PageTitleResponse {
  url?: string;
  title?: string;
  source?: string;
  error?: string;
}

interface OpenTabsResponse {
  tabs?: unknown[];
  error?: string;
}

const SOURCE_APP = "sitenotes-app";
const SOURCE_EXT = "sitenotes-extension";

let lastRequestId: string | null = null;

// O background reinjeta este arquivo a cada atualizacao da aba. O bundle IIFE isola as
// declaracoes; o guard evita registrar os listeners de novo.
if (globalThis.__sitenotesContentLoaded) {
  document.documentElement?.setAttribute("data-sitenotes-ext", "1");
} else {
  globalThis.__sitenotesContentLoaded = true;
  installBridge();
  markPage();
}

function installBridge(): void {
  window.addEventListener("message", (event: MessageEvent<AppRequest | null>) => {
    const data = event.data;
    if (!data || data.source !== SOURCE_APP) {
      return;
    }

    handleAppRequest(data);
  });

  const root = document.documentElement;
  if (root) {
    const observer = new MutationObserver(() => {
      const raw = root.getAttribute("data-sitenotes-req");
      if (!raw) {
        return;
      }

      let data: AppRequest | null;
      try {
        data = JSON.parse(raw) as AppRequest | null;
      } catch {
        return;
      }

      if (!data || data.source !== SOURCE_APP) {
        return;
      }

      handleAppRequest(data);
    });

    observer.observe(root, { attributes: true, attributeFilter: ["data-sitenotes-req"] });
  }
}

function markPage(): void {
  const root = document.documentElement;
  if (!root) {
    return;
  }

  root.setAttribute("data-sitenotes-ext", "1");
  postToPage({ source: SOURCE_EXT, type: "READY" });
}

function handleAppRequest(data: AppRequest): void {
  const { type, requestId } = data;
  if (requestId && requestId === lastRequestId) {
    return;
  }

  lastRequestId = requestId || null;

  if (type === "PING") {
    respond({ source: SOURCE_EXT, type: "PONG", requestId });
    return;
  }

  if (type === "RESOLVE_PAGE_TITLE") {
    sendRuntimeMessage<PageTitleResponse>({ type: "RESOLVE_PAGE_TITLE", url: data.url })
      .then((response) => {
        respond({
          source: SOURCE_EXT,
          type: "PAGE_TITLE",
          requestId,
          url: response?.url || data.url || "",
          title: response?.title || "",
          sourceKind: response?.source || "fallback",
          error: response?.error || null,
        });
      })
      .catch((error: unknown) => {
        respond({
          source: SOURCE_EXT,
          type: "PAGE_TITLE",
          requestId,
          url: data.url || "",
          title: "",
          sourceKind: "fallback",
          error: errorMessage(error),
        });
      });
    return;
  }

  if (type !== "GET_OPEN_TABS") {
    return;
  }

  sendRuntimeMessage<OpenTabsResponse>({ type: "GET_OPEN_TABS" })
    .then((response) => {
      respond({
        source: SOURCE_EXT,
        type: "OPEN_TABS",
        requestId,
        tabs: response?.tabs || [],
        error: response?.error || null,
      });
    })
    .catch((error: unknown) => {
      respond({
        source: SOURCE_EXT,
        type: "OPEN_TABS",
        requestId,
        tabs: [],
        error: errorMessage(error),
      });
    });
}

function respond(payload: Record<string, unknown>): void {
  postToPage(payload);

  const root = document.documentElement;
  if (!root) {
    return;
  }

  const serialized = JSON.stringify(payload);
  root.removeAttribute("data-sitenotes-res");
  root.setAttribute("data-sitenotes-res", serialized);
}

function postToPage(payload: Record<string, unknown>): void {
  window.postMessage(payload, "*");
}

function sendRuntimeMessage<T>(message: object): Promise<T | undefined> {
  const result = api.runtime.sendMessage(message) as Promise<T> | undefined;
  if (result && typeof result.then === "function") {
    return result;
  }

  return new Promise((resolve, reject) => {
    api.runtime.sendMessage(message, (response: T) => {
      const err = api.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }

      resolve(response);
    });
  });
}
