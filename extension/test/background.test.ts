import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface StubTab {
  id?: number;
  windowId?: number;
  title?: string;
  url?: string;
  favIconUrl?: string;
  active?: boolean;
  lastAccessed?: number;
}

interface TabUpdateInfo {
  status?: string;
  url?: string;
}

type RuntimeMessageListener = (message: unknown) => Promise<unknown> | undefined;
type TabsUpdatedListener = (tabId: number, info: TabUpdateInfo, tab: StubTab) => void;

const appOrigins = {
  hydrateAppOrigins: vi.fn(async () => undefined),
  getRegisteredOrigins: vi.fn((): ReadonlySet<string> => new Set()),
  registerAppOrigin: vi.fn(async (origin: string) => origin || null),
  getPreferredAppUrl: vi.fn(() => "http://localhost:4200"),
};

const pageTitle = {
  resolvePageTitle: vi.fn(async (url: unknown) => ({ url, title: "Titulo", source: "page" })),
  errorMessage: (error: unknown) => (error instanceof Error ? error.message : String(error)),
  normalizePageTitle: (title: unknown) => String(title ?? "").trim(),
};

const siteNotesApp = {
  isSiteNotesAppTab: vi.fn<(url: string | undefined, origins: ReadonlySet<string>) => boolean>(
    () => false,
  ),
};

vi.mock("../src/app-origins", () => appOrigins);
vi.mock("../src/page-title", () => pageTitle);
vi.mock("../src/site-notes-app", () => siteNotesApp);

function createChromeStub(tabsQueryImpl?: (query: object) => Promise<StubTab[]>) {
  const onMessageListeners: RuntimeMessageListener[] = [];
  const onUpdatedListeners: TabsUpdatedListener[] = [];
  const tabsQuery = vi.fn(tabsQueryImpl ?? (async () => []));
  const executeScript = vi.fn(async () => undefined);

  const chromeStub = {
    runtime: {
      onMessage: {
        addListener: (fn: RuntimeMessageListener) => {
          onMessageListeners.push(fn);
        },
      },
    },
    tabs: {
      onUpdated: {
        addListener: (fn: TabsUpdatedListener) => {
          onUpdatedListeners.push(fn);
        },
      },
      query: tabsQuery,
    },
    scripting: {
      executeScript,
    },
  };

  return { chromeStub, onMessageListeners, onUpdatedListeners, tabsQuery, executeScript };
}

async function loadBackground(chromeStub: object) {
  vi.resetModules();
  vi.stubGlobal("chrome", chromeStub);
  await import("../src/background");
  // Drena a cadeia assincrona que watchSiteNotesTabs() dispara no import
  // (hydrateAppOrigins().then(() => tabs.query({})...)) antes que o teste zere os mocks.
  await flush();
}

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  appOrigins.hydrateAppOrigins.mockReset().mockResolvedValue(undefined);
  appOrigins.getRegisteredOrigins.mockReset().mockReturnValue(new Set());
  appOrigins.registerAppOrigin.mockReset().mockImplementation(async (origin: string) => origin || null);
  appOrigins.getPreferredAppUrl.mockReset().mockReturnValue("http://localhost:4200");
  pageTitle.resolvePageTitle.mockReset().mockResolvedValue({ url: "", title: "Titulo", source: "page" });
  siteNotesApp.isSiteNotesAppTab.mockReset().mockReturnValue(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("onRuntimeMessage", () => {
  it("GET_OPEN_TABS filtra, ordena e normaliza as abas uteis", async () => {
    const tabActive: StubTab = {
      id: 2,
      windowId: 1,
      title: "A",
      url: "http://a.example/",
      active: true,
      lastAccessed: 50,
    };
    const tabInactive: StubTab = {
      id: 1,
      windowId: 1,
      title: "  B  ",
      url: "http://b.example/",
      favIconUrl: "icon-b",
      active: false,
      lastAccessed: 100,
    };
    const appTab: StubTab = { id: 3, windowId: 1, title: "App", url: "http://localhost:4200/" };
    const noUrlTab: StubTab = { id: 4, windowId: 1, title: "Sem URL" };
    const invalidUrlTab: StubTab = { id: 5, windowId: 1, title: "Invalida", url: "nao-e-uma-url" };

    const { chromeStub, onMessageListeners, tabsQuery } = createChromeStub(async () => [
      tabActive,
      tabInactive,
      appTab,
      noUrlTab,
      invalidUrlTab,
    ]);
    siteNotesApp.isSiteNotesAppTab.mockImplementation((url) => url === "http://localhost:4200/");

    await loadBackground(chromeStub);

    const result = await onMessageListeners[0]!({ type: "GET_OPEN_TABS" });

    expect(tabsQuery).toHaveBeenCalledWith({ url: ["http://*/*", "https://*/*"] });
    expect(result).toEqual({
      tabs: [
        {
          id: 2,
          windowId: 1,
          title: "A",
          url: "http://a.example/",
          favIconUrl: "",
          active: true,
        },
        {
          id: 1,
          windowId: 1,
          title: "B",
          url: "http://b.example/",
          favIconUrl: "icon-b",
          active: false,
        },
      ],
    });
  });

  it("RESOLVE_PAGE_TITLE devolve o resultado de resolvePageTitle quando ele resolve", async () => {
    pageTitle.resolvePageTitle.mockResolvedValueOnce({
      url: "http://x.example/",
      title: "X",
      source: "page",
    });
    const { chromeStub, onMessageListeners } = createChromeStub();

    await loadBackground(chromeStub);
    const result = await onMessageListeners[0]!({ type: "RESOLVE_PAGE_TITLE", url: "http://x.example/" });

    expect(result).toEqual({ url: "http://x.example/", title: "X", source: "page" });
  });

  it("RESOLVE_PAGE_TITLE cai no fallback com a mensagem de erro quando resolvePageTitle rejeita", async () => {
    pageTitle.resolvePageTitle.mockRejectedValueOnce(new Error("boom"));
    const { chromeStub, onMessageListeners } = createChromeStub();

    await loadBackground(chromeStub);
    const result = await onMessageListeners[0]!({ type: "RESOLVE_PAGE_TITLE", url: " http://y.example/ " });

    expect(result).toEqual({
      url: "http://y.example/",
      title: "http://y.example/",
      source: "fallback",
      error: "boom",
    });
  });

  it("REGISTER_APP_ORIGIN delega a registerAppOrigin e embrulha o resultado", async () => {
    appOrigins.registerAppOrigin.mockResolvedValueOnce("http://registrada.example");
    const { chromeStub, onMessageListeners } = createChromeStub();

    await loadBackground(chromeStub);
    const result = await onMessageListeners[0]!({
      type: "REGISTER_APP_ORIGIN",
      origin: "http://registrada.example",
    });

    expect(appOrigins.registerAppOrigin).toHaveBeenCalledWith("http://registrada.example");
    expect(result).toEqual({ origin: "http://registrada.example" });
  });

  it("GET_APP_URL devolve a url preferida atual", async () => {
    appOrigins.getPreferredAppUrl.mockReturnValueOnce("http://preferida.example");
    const { chromeStub, onMessageListeners } = createChromeStub();

    await loadBackground(chromeStub);
    const result = await onMessageListeners[0]!({ type: "GET_APP_URL" });

    expect(result).toEqual({ url: "http://preferida.example" });
  });

  it("tipo desconhecido (ou mensagem ausente) nao e tratado", async () => {
    const { chromeStub, onMessageListeners } = createChromeStub();

    await loadBackground(chromeStub);

    expect(onMessageListeners[0]!({ type: "ALGO_DESCONHECIDO" })).toBeUndefined();
    expect(onMessageListeners[0]!(undefined)).toBeUndefined();
  });
});

describe("queryHttpTabs (via GET_OPEN_TABS)", () => {
  it("cai para query({}) quando o filtro de URL falha", async () => {
    const fallbackTab: StubTab = { id: 9, windowId: 1, title: "Fallback", url: "http://fallback.example/" };
    const tabsQueryImpl = vi.fn(async (query: object) => {
      if ("url" in query) {
        throw new Error("host permission ausente");
      }
      return [fallbackTab];
    });
    const { chromeStub, onMessageListeners, tabsQuery } = createChromeStub(tabsQueryImpl);

    await loadBackground(chromeStub);
    const result = await onMessageListeners[0]!({ type: "GET_OPEN_TABS" });

    expect(tabsQuery).toHaveBeenCalledWith({});
    expect(result).toEqual({
      tabs: [
        {
          id: 9,
          windowId: 1,
          title: "Fallback",
          url: "http://fallback.example/",
          favIconUrl: "",
          active: false,
        },
      ],
    });
  });

  it("cai para query({}) quando o filtro de URL devolve lista vazia", async () => {
    const fallbackTab: StubTab = { id: 10, windowId: 1, title: "Vazio", url: "http://vazio.example/" };
    const tabsQueryImpl = vi.fn(async (query: object) => ("url" in query ? [] : [fallbackTab]));
    const { chromeStub, onMessageListeners, tabsQuery } = createChromeStub(tabsQueryImpl);

    await loadBackground(chromeStub);
    tabsQuery.mockClear();
    const result = await onMessageListeners[0]!({ type: "GET_OPEN_TABS" });

    expect(tabsQuery).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ tabs: [{ id: 10 }] });
  });
});

describe("watchSiteNotesTabs", () => {
  it("so reinjeta o content script quando info.status === 'complete'", async () => {
    const { chromeStub, onUpdatedListeners, executeScript } = createChromeStub(async () => []);
    siteNotesApp.isSiteNotesAppTab.mockImplementation((url) => url === "http://localhost:4200/pagina");

    await loadBackground(chromeStub);
    executeScript.mockClear();

    const listener = onUpdatedListeners[0]!;
    const tab: StubTab = { url: "http://localhost:4200/pagina" };

    listener(1, { status: "loading", url: "http://localhost:4200/pagina" }, tab);
    await flush();
    expect(executeScript).not.toHaveBeenCalled();

    listener(1, { url: "http://localhost:4200/pagina" }, tab);
    await flush();
    expect(executeScript).not.toHaveBeenCalled();

    listener(1, { status: "complete", url: "http://localhost:4200/pagina" }, tab);
    await flush();
    expect(executeScript).toHaveBeenCalledTimes(1);
    expect(executeScript).toHaveBeenCalledWith({ target: { tabId: 1 }, files: ["content.js"] });
  });

  it("ignora atualizacoes de abas que nao sao do SiteNotes", async () => {
    const { chromeStub, onUpdatedListeners, executeScript } = createChromeStub(async () => []);
    siteNotesApp.isSiteNotesAppTab.mockReturnValue(false);

    await loadBackground(chromeStub);
    executeScript.mockClear();

    onUpdatedListeners[0]!(1, { status: "complete", url: "http://outro-site.example/" }, {
      url: "http://outro-site.example/",
    });
    await flush();

    expect(executeScript).not.toHaveBeenCalled();
  });

  it("usa tab.url quando info.url nao vem preenchido", async () => {
    const { chromeStub, onUpdatedListeners, executeScript } = createChromeStub(async () => []);
    siteNotesApp.isSiteNotesAppTab.mockImplementation((url) => url === "http://localhost:4200/so-tab-url");

    await loadBackground(chromeStub);
    executeScript.mockClear();

    onUpdatedListeners[0]!(7, { status: "complete" }, { url: "http://localhost:4200/so-tab-url" });
    await flush();

    expect(executeScript).toHaveBeenCalledWith({ target: { tabId: 7 }, files: ["content.js"] });
  });
});
