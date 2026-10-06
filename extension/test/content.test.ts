// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AppRequest,
  BRIDGE_ATTRIBUTES,
  BRIDGE_PROTOCOL_VERSION,
  BRIDGE_SOURCE_APP,
  BRIDGE_SOURCE_EXTENSION,
  ExtensionMessage,
} from "../../shared/bridge-protocol";

const messaging = {
  sendRuntimeMessage: vi.fn(),
};

const siteNotesApp = {
  hasSiteNotesAppMarker: vi.fn(() => true),
  isSiteNotesAppUrl: vi.fn(() => false),
};

vi.mock("../src/messaging", () => messaging);
vi.mock("../src/site-notes-app", () => siteNotesApp);

async function loadContent(options: { alreadyLoaded?: boolean } = {}) {
  vi.resetModules();
  document.documentElement.removeAttribute(BRIDGE_ATTRIBUTES.ready);
  document.documentElement.removeAttribute(BRIDGE_ATTRIBUTES.request);
  document.documentElement.removeAttribute(BRIDGE_ATTRIBUTES.response);
  globalThis.__sitenotesContentLoaded = options.alreadyLoaded ?? undefined;
  await import("../src/content");
}

function readResponse(): ExtensionMessage | null {
  const raw = document.documentElement.getAttribute(BRIDGE_ATTRIBUTES.response);
  return raw ? (JSON.parse(raw) as ExtensionMessage) : null;
}

async function waitForResponse(): Promise<ExtensionMessage> {
  return vi.waitFor(() => {
    const response = readResponse();
    if (!response) {
      throw new Error("sem resposta ainda");
    }
    return response;
  });
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type AppRequestBody = DistributiveOmit<AppRequest, "source" | "version" | "requestId">;

function appRequest(requestId: string, body: AppRequestBody): AppRequest {
  return {
    source: BRIDGE_SOURCE_APP,
    version: BRIDGE_PROTOCOL_VERSION,
    requestId,
    ...body,
  } as AppRequest;
}

// jsdom nao preenche `event.source`/`event.origin` corretamente para um `window.postMessage`
// que a propria janela envia para si mesma (ambos ficam vazios/false), diferente de um browser
// real. Para exercitar o mesmo caminho que o app usa (postMessage dentro da mesma pagina),
// disparamos o MessageEvent manualmente com os campos que um browser real preencheria.
function dispatchMessage(data: unknown, origin: string = location.origin): void {
  window.dispatchEvent(new MessageEvent("message", { data, origin, source: window }));
}

function sendViaAttribute(request: AppRequest): void {
  document.documentElement.setAttribute(BRIDGE_ATTRIBUTES.request, JSON.stringify(request));
}

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  siteNotesApp.hasSiteNotesAppMarker.mockReset().mockReturnValue(true);
  siteNotesApp.isSiteNotesAppUrl.mockReset().mockReturnValue(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("handleAppRequest", () => {
  beforeAll(async () => {
    // Import unico para todo o describe: o content script instala listeners (`message` e
    // MutationObserver) direto em `window`/`document`, que o Vitest reusa entre os testes do
    // mesmo arquivo. Reimportar a cada teste empilharia listeners duplicados reagindo ao mesmo
    // evento (cada um consumindo o mock de `sendRuntimeMessage` de forma imprevisivel).
    messaging.sendRuntimeMessage.mockResolvedValue(undefined);
    await loadContent();
  });

  beforeEach(() => {
    messaging.sendRuntimeMessage.mockReset().mockResolvedValue(undefined);
    document.documentElement.removeAttribute(BRIDGE_ATTRIBUTES.response);
  });

  it("responde PING via window.postMessage (MessageEvent da propria pagina)", async () => {
    dispatchMessage(appRequest("req-ping-1", { type: "PING" }));

    const response = await waitForResponse();

    expect(response).toMatchObject({
      type: "PONG",
      requestId: "req-ping-1",
      source: BRIDGE_SOURCE_EXTENSION,
      version: BRIDGE_PROTOCOL_VERSION,
    });
  });

  it("responde PING via mudanca do atributo BRIDGE_ATTRIBUTES.request", async () => {
    sendViaAttribute(appRequest("req-ping-2", { type: "PING" }));

    const response = await waitForResponse();

    expect(response).toMatchObject({ type: "PONG", requestId: "req-ping-2" });
  });

  it("responde RESOLVE_PAGE_TITLE com o resultado do background", async () => {
    messaging.sendRuntimeMessage.mockResolvedValueOnce({
      url: "http://x.example/",
      title: "Titulo X",
      source: "page",
    });

    dispatchMessage(appRequest("req-title-1", { type: "RESOLVE_PAGE_TITLE", url: "http://x.example/" }));

    const response = await waitForResponse();

    expect(messaging.sendRuntimeMessage).toHaveBeenCalledWith({
      type: "RESOLVE_PAGE_TITLE",
      url: "http://x.example/",
    });
    expect(response).toMatchObject({
      type: "PAGE_TITLE",
      requestId: "req-title-1",
      url: "http://x.example/",
      title: "Titulo X",
      sourceKind: "page",
      error: null,
    });
  });

  it("RESOLVE_PAGE_TITLE cai no fallback (url como titulo) quando o background rejeita", async () => {
    messaging.sendRuntimeMessage.mockRejectedValueOnce(new Error("sem resposta"));

    sendViaAttribute(appRequest("req-title-2", { type: "RESOLVE_PAGE_TITLE", url: "http://y.example/" }));

    const response = await waitForResponse();

    expect(response).toMatchObject({
      type: "PAGE_TITLE",
      requestId: "req-title-2",
      url: "http://y.example/",
      title: "http://y.example/",
      sourceKind: "fallback",
      error: "sem resposta",
    });
  });

  it("responde GET_OPEN_TABS com as abas do background", async () => {
    const tabs = [{ id: 1, windowId: 1, title: "Aba", url: "http://a.example/", favIconUrl: "", active: true }];
    messaging.sendRuntimeMessage.mockResolvedValueOnce({ tabs });

    dispatchMessage(appRequest("req-tabs-1", { type: "GET_OPEN_TABS" }));

    const response = await waitForResponse();

    expect(response).toMatchObject({ type: "OPEN_TABS", requestId: "req-tabs-1", tabs, error: null });
  });

  it("GET_OPEN_TABS devolve tabs vazio e a mensagem de erro quando o background rejeita", async () => {
    messaging.sendRuntimeMessage.mockRejectedValueOnce(new Error("sem permissao"));

    sendViaAttribute(appRequest("req-tabs-2", { type: "GET_OPEN_TABS" }));

    const response = await waitForResponse();

    expect(response).toMatchObject({
      type: "OPEN_TABS",
      requestId: "req-tabs-2",
      tabs: [],
      error: "sem permissao",
    });
  });

  it("ignora um requestId repetido", async () => {
    dispatchMessage(appRequest("req-dup", { type: "PING" }));
    await waitForResponse();
    document.documentElement.removeAttribute(BRIDGE_ATTRIBUTES.response);

    dispatchMessage(appRequest("req-dup", { type: "GET_OPEN_TABS" }));
    await flush();

    expect(readResponse()).toBeNull();
    expect(messaging.sendRuntimeMessage).not.toHaveBeenCalledWith({ type: "GET_OPEN_TABS" });
  });

  it("usa location.origin como targetOrigin ao postar a resposta", async () => {
    const postMessageSpy = vi.spyOn(window, "postMessage");

    sendViaAttribute(appRequest("req-origin-1", { type: "PING" }));
    await waitForResponse();

    const call = postMessageSpy.mock.calls.find(([data]) => (data as ExtensionMessage).type === "PONG");
    expect(call?.[1]).toBe(location.origin);
  });

  it("o listener de message ignora eventos com event.origin diferente de location.origin", async () => {
    dispatchMessage(appRequest("req-origin-2", { type: "PING" }), "http://attacker.example");
    await flush();

    expect(readResponse()).toBeNull();
  });
});

describe("boot", () => {
  it("nao instala a ponte quando a pagina nao e reconhecida como SiteNotes", async () => {
    siteNotesApp.hasSiteNotesAppMarker.mockReturnValue(false);
    siteNotesApp.isSiteNotesAppUrl.mockReturnValue(false);
    messaging.sendRuntimeMessage.mockResolvedValue(undefined);

    await loadContent();

    expect(document.documentElement.getAttribute(BRIDGE_ATTRIBUTES.ready)).toBeNull();
    expect(messaging.sendRuntimeMessage).not.toHaveBeenCalled();
  });

  it("seta o atributo ready e registra a origem na primeira execucao", async () => {
    messaging.sendRuntimeMessage.mockResolvedValue(undefined);

    await loadContent();

    expect(document.documentElement.getAttribute(BRIDGE_ATTRIBUTES.ready)).toBe(
      String(BRIDGE_PROTOCOL_VERSION),
    );
    expect(messaging.sendRuntimeMessage).toHaveBeenCalledWith({
      type: "REGISTER_APP_ORIGIN",
      origin: location.origin,
    });
  });

  it("quando o content script e reinjetado (guard ja true), so reseta ready e registra a origem", async () => {
    messaging.sendRuntimeMessage.mockResolvedValue(undefined);

    await loadContent({ alreadyLoaded: true });

    expect(document.documentElement.getAttribute(BRIDGE_ATTRIBUTES.ready)).toBe(
      String(BRIDGE_PROTOCOL_VERSION),
    );
    expect(messaging.sendRuntimeMessage).toHaveBeenCalledWith({
      type: "REGISTER_APP_ORIGIN",
      origin: location.origin,
    });
  });
});
