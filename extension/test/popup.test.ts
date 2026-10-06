// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SITE_NOTES_APP_URL } from "../src/site-notes-app";

interface PopupTab {
  title?: string;
  url?: string;
}

const messaging = {
  sendRuntimeMessage: vi.fn(),
};

vi.mock("../src/messaging", () => messaging);

async function loadPopup() {
  vi.resetModules();
  document.body.innerHTML = '<p id="status"></p><ul id="tabs"></ul><a id="app-link"></a>';
  await import("../src/popup");
}

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function statusEl(): HTMLElement {
  return document.getElementById("status")!;
}

function tabsEl(): HTMLElement {
  return document.getElementById("tabs")!;
}

function appLinkEl(): HTMLAnchorElement {
  return document.getElementById("app-link") as HTMLAnchorElement;
}

function mockMessages(options: {
  appUrl?: () => Promise<{ url?: string } | undefined>;
  openTabs?: () => Promise<{ tabs?: PopupTab[]; error?: string } | undefined>;
}) {
  messaging.sendRuntimeMessage.mockImplementation((message: { type: string }) => {
    if (message.type === "GET_APP_URL") {
      return options.appUrl ? options.appUrl() : Promise.resolve(undefined);
    }
    if (message.type === "GET_OPEN_TABS") {
      return options.openTabs ? options.openTabs() : Promise.resolve(undefined);
    }
    return Promise.resolve(undefined);
  });
}

beforeEach(() => {
  messaging.sendRuntimeMessage.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("popup", () => {
  it("mostra o fallback DEFAULT_SITE_NOTES_APP_URL antes de qualquer resposta chegar", async () => {
    mockMessages({
      appUrl: () => new Promise(() => undefined),
      openTabs: () => new Promise(() => undefined),
    });

    await loadPopup();

    expect(appLinkEl().getAttribute("href")).toBe(DEFAULT_SITE_NOTES_APP_URL);
    expect(appLinkEl().textContent).toBe(DEFAULT_SITE_NOTES_APP_URL);
  });

  it("mostra a contagem e a lista de abas, truncando em 8 itens", async () => {
    const tabs: PopupTab[] = Array.from({ length: 10 }, (_, i) => ({
      title: `Aba ${i}`,
      url: `http://exemplo${i}.example/`,
    }));
    mockMessages({
      appUrl: () => Promise.resolve({ url: "http://app-aberto.example:4200" }),
      openTabs: () => Promise.resolve({ tabs }),
    });

    await loadPopup();
    await flush();

    expect(statusEl().textContent).toBe("10 aba(s) pronta(s) para anotar.");
    expect(tabsEl().children.length).toBe(8);
    expect(tabsEl().children[0]!.textContent).toBe("Aba 0");
    expect(tabsEl().children[7]!.textContent).toBe("Aba 7");
    expect(appLinkEl().textContent).toBe("http://app-aberto.example:4200");
  });

  it("mensagem para zero abas", async () => {
    mockMessages({ openTabs: () => Promise.resolve({ tabs: [] }) });

    await loadPopup();
    await flush();

    expect(statusEl().textContent).toBe(
      "Nenhuma aba http/https encontrada. Recarregue a extensao e conceda acesso aos sites.",
    );
    expect(tabsEl().children.length).toBe(0);
  });

  it("usa tab.url quando a aba nao tem titulo", async () => {
    mockMessages({
      openTabs: () => Promise.resolve({ tabs: [{ url: "http://sem-titulo.example/" }] }),
    });

    await loadPopup();
    await flush();

    expect(tabsEl().children[0]!.textContent).toBe("http://sem-titulo.example/");
  });

  it("mostra response.error no status e nao preenche a lista", async () => {
    mockMessages({ openTabs: () => Promise.resolve({ error: "falha ao listar abas" }) });

    await loadPopup();
    await flush();

    expect(statusEl().textContent).toBe("falha ao listar abas");
    expect(tabsEl().children.length).toBe(0);
  });

  it("mostra a mensagem de erro quando GET_OPEN_TABS rejeita", async () => {
    mockMessages({ openTabs: () => Promise.reject(new Error("sem conexao com o background")) });

    await loadPopup();
    await flush();

    expect(statusEl().textContent).toBe("sem conexao com o background");
  });

  it("mantem o link padrao quando GET_APP_URL rejeita", async () => {
    mockMessages({ appUrl: () => Promise.reject(new Error("sem resposta")) });

    await loadPopup();
    await flush();

    expect(appLinkEl().getAttribute("href")).toBe(DEFAULT_SITE_NOTES_APP_URL);
    expect(appLinkEl().textContent).toBe(DEFAULT_SITE_NOTES_APP_URL);
  });

  it("mantem o link padrao quando GET_APP_URL resolve sem url", async () => {
    mockMessages({ appUrl: () => Promise.resolve({}) });

    await loadPopup();
    await flush();

    expect(appLinkEl().getAttribute("href")).toBe(DEFAULT_SITE_NOTES_APP_URL);
    expect(appLinkEl().textContent).toBe(DEFAULT_SITE_NOTES_APP_URL);
  });
});
