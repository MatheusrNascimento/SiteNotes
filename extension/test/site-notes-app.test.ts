import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getPreferredAppUrl,
  getRegisteredOrigins,
  hydrateAppOrigins,
  registerAppOrigin,
  resetAppOriginsForTests,
} from "../src/app-origins";
import {
  DEFAULT_SITE_NOTES_APP_URL,
  hasSiteNotesAppMarker,
  isRegisteredAppOrigin,
  isSiteNotesAppTab,
  isSiteNotesAppUrl,
} from "../src/site-notes-app";
import { SITE_NOTES_APP_MARKER } from "../../shared/bridge-protocol";

afterEach(() => {
  resetAppOriginsForTests();
  vi.unstubAllGlobals();
});

describe("isSiteNotesAppUrl", () => {
  it.each([
    "http://localhost:4200/references",
    "http://127.0.0.1:4200/",
    "https://localhost:4200",
  ])("reconhece o app de dev em %s", (url) => {
    expect(isSiteNotesAppUrl(url)).toBe(true);
  });

  it.each([
    "http://localhost:5210/api/references",
    "http://localhost/",
    "http://example.com:4200/",
    "http://10.0.0.50:4200/",
    "http://10.0.0.50/",
    "http://sitenotes/",
    "file:///C:/index.html",
    "nao e url",
    undefined,
  ])("ignora %s na allowlist de URL", (url) => {
    expect(isSiteNotesAppUrl(url)).toBe(false);
  });

  it("o fallback do popup aponta para uma URL reconhecida", () => {
    expect(isSiteNotesAppUrl(DEFAULT_SITE_NOTES_APP_URL)).toBe(true);
  });
});

describe("hasSiteNotesAppMarker", () => {
  it("detecta o atributo no elemento raiz", () => {
    const attrs = new Set<string>();
    const root = {
      hasAttribute: (name: string) => attrs.has(name),
      setAttribute: (name: string) => {
        attrs.add(name);
      },
    } as unknown as Element;

    expect(hasSiteNotesAppMarker(root)).toBe(false);
    root.setAttribute(SITE_NOTES_APP_MARKER, "1");
    expect(hasSiteNotesAppMarker(root)).toBe(true);
    expect(hasSiteNotesAppMarker(null)).toBe(false);
  });
});

describe("origens registradas", () => {
  it("reconhece URLs da origem registrada e atualiza o link preferido", async () => {
    const storage: Record<string, unknown> = {};
    vi.stubGlobal("chrome", {
      storage: {
        local: {
          get: vi.fn(async (keys: string[]) => {
            const out: Record<string, unknown> = {};
            for (const key of keys) {
              if (key in storage) {
                out[key] = storage[key];
              }
            }
            return out;
          }),
          set: vi.fn(async (values: Record<string, unknown>) => {
            Object.assign(storage, values);
          }),
        },
      },
    });

    await hydrateAppOrigins();
    expect(getPreferredAppUrl()).toBe(DEFAULT_SITE_NOTES_APP_URL);

    await registerAppOrigin("http://10.0.0.50:4200/references");
    expect([...getRegisteredOrigins()]).toEqual(["http://10.0.0.50:4200"]);
    expect(getPreferredAppUrl()).toBe("http://10.0.0.50:4200");
    expect(isRegisteredAppOrigin("http://10.0.0.50:4200/foo", getRegisteredOrigins())).toBe(true);
    expect(isSiteNotesAppTab("http://10.0.0.50:4200/", getRegisteredOrigins())).toBe(true);
    expect(isSiteNotesAppTab("http://example.com/", getRegisteredOrigins())).toBe(false);
  });

  it("recarrega origens persistidas no hydrate", async () => {
    const storage: Record<string, unknown> = {
      "sitenotes.appOrigins": ["http://sitenotes"],
      "sitenotes.preferredAppOrigin": "http://sitenotes",
    };
    vi.stubGlobal("chrome", {
      storage: {
        local: {
          get: vi.fn(async () => ({ ...storage })),
          set: vi.fn(async () => undefined),
        },
      },
    });

    await hydrateAppOrigins();
    expect(getPreferredAppUrl()).toBe("http://sitenotes");
    expect(isSiteNotesAppTab("http://sitenotes/app", getRegisteredOrigins())).toBe(true);
  });
});
