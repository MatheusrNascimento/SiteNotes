import {
  AppRequest,
  BRIDGE_ATTRIBUTES,
  BRIDGE_PROTOCOL_VERSION,
  BRIDGE_SOURCE_EXTENSION,
  BridgeOpenTab,
  ExtensionMessage,
  PageTitleSource,
  isAppRequest,
} from "../../shared/bridge-protocol";
import { sendRuntimeMessage } from "./messaging";
import { errorMessage } from "./page-title";
import { hasSiteNotesAppMarker, isSiteNotesAppUrl } from "./site-notes-app";

declare global {
  var __sitenotesContentLoaded: boolean | undefined;
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type ExtensionMessageBody = DistributiveOmit<ExtensionMessage, "source" | "version">;

interface PageTitleResponse {
  url?: string;
  title?: string;
  source?: PageTitleSource;
  error?: string;
}

interface OpenTabsResponse {
  tabs?: BridgeOpenTab[];
  error?: string;
}

const READY_VALUE = String(BRIDGE_PROTOCOL_VERSION);

let lastRequestId: string | null = null;

// O content script roda em qualquer http(s); so abre a ponte no SiteNotes (marcador ou allowlist de dev).
if (hasSiteNotesAppMarker() || isSiteNotesAppUrl(location.href)) {
  boot();
}

// O background reinjeta este arquivo a cada atualizacao da aba. O bundle IIFE isola as
// declaracoes; o guard evita registrar os listeners de novo.
function boot(): void {
  if (globalThis.__sitenotesContentLoaded) {
    document.documentElement?.setAttribute(BRIDGE_ATTRIBUTES.ready, READY_VALUE);
    void registerOrigin();
    return;
  }

  globalThis.__sitenotesContentLoaded = true;
  installBridge();
  markPage();
  void registerOrigin();
}

function registerOrigin(): Promise<unknown> {
  return sendRuntimeMessage({ type: "REGISTER_APP_ORIGIN", origin: location.origin }).catch(
    () => undefined,
  );
}

function installBridge(): void {
  window.addEventListener("message", (event: MessageEvent<unknown>) => {
    if (isAppRequest(event.data)) {
      handleAppRequest(event.data);
    }
  });

  const root = document.documentElement;
  if (root) {
    const observer = new MutationObserver(() => {
      const raw = root.getAttribute(BRIDGE_ATTRIBUTES.request);
      if (!raw) {
        return;
      }

      let data: unknown;
      try {
        data = JSON.parse(raw);
      } catch {
        return;
      }

      if (isAppRequest(data)) {
        handleAppRequest(data);
      }
    });

    observer.observe(root, { attributes: true, attributeFilter: [BRIDGE_ATTRIBUTES.request] });
  }
}

function markPage(): void {
  const root = document.documentElement;
  if (!root) {
    return;
  }

  root.setAttribute(BRIDGE_ATTRIBUTES.ready, READY_VALUE);
  postToPage({ type: "READY" });
}

function handleAppRequest(data: AppRequest): void {
  const { requestId } = data;
  if (requestId === lastRequestId) {
    return;
  }

  lastRequestId = requestId;

  switch (data.type) {
    case "PING":
      respond({ type: "PONG", requestId });
      return;

    case "RESOLVE_PAGE_TITLE":
      sendRuntimeMessage<PageTitleResponse>({ type: "RESOLVE_PAGE_TITLE", url: data.url })
        .then((response) => {
          respond({
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
            type: "PAGE_TITLE",
            requestId,
            url: data.url || "",
            title: "",
            sourceKind: "fallback",
            error: errorMessage(error),
          });
        });
      return;

    case "GET_OPEN_TABS":
      sendRuntimeMessage<OpenTabsResponse>({ type: "GET_OPEN_TABS" })
        .then((response) => {
          respond({
            type: "OPEN_TABS",
            requestId,
            tabs: response?.tabs || [],
            error: response?.error || null,
          });
        })
        .catch((error: unknown) => {
          respond({
            type: "OPEN_TABS",
            requestId,
            tabs: [],
            error: errorMessage(error),
          });
        });
      return;
  }
}

function respond(body: ExtensionMessageBody): void {
  const payload = postToPage(body);

  const root = document.documentElement;
  if (!root) {
    return;
  }

  root.removeAttribute(BRIDGE_ATTRIBUTES.response);
  root.setAttribute(BRIDGE_ATTRIBUTES.response, JSON.stringify(payload));
}

function postToPage(body: ExtensionMessageBody): ExtensionMessage {
  const payload = {
    ...body,
    source: BRIDGE_SOURCE_EXTENSION,
    version: BRIDGE_PROTOCOL_VERSION,
  } as ExtensionMessage;
  window.postMessage(payload, "*");
  return payload;
}
