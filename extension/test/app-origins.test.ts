import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getPreferredAppUrl,
  getRegisteredOrigins,
  hydrateAppOrigins,
  registerAppOrigin,
  resetAppOriginsForTests,
} from "../src/app-origins";
import { DEFAULT_SITE_NOTES_APP_URL } from "../src/site-notes-app";

function stubStorage(
  get: (keys: string[]) => Promise<Record<string, unknown>>,
  set: (values: Record<string, unknown>) => Promise<void> = async () => undefined,
) {
  vi.stubGlobal("chrome", { storage: { local: { get: vi.fn(get), set: vi.fn(set) } } });
}

beforeEach(() => {
  resetAppOriginsForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getPreferredAppUrl", () => {
  it("cai no default sem origem preferida", () => {
    expect(getPreferredAppUrl()).toBe(DEFAULT_SITE_NOTES_APP_URL);
  });
});

describe("hydrateAppOrigins", () => {
  it("devolve a mesma promise em chamadas concorrentes (idempotente)", () => {
    const get = vi.fn(async () => ({}));
    stubStorage(get);

    const first = hydrateAppOrigins();
    const second = hydrateAppOrigins();

    expect(first).toBe(second);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("ignora origens persistidas com protocolo que nao e http/https", async () => {
    stubStorage(async () => ({
      "sitenotes.appOrigins": ["ftp://example.com", "nao e url", 42, "http://valido.example"],
      "sitenotes.preferredAppOrigin": "javascript:alert(1)",
    }));

    await hydrateAppOrigins();

    expect([...getRegisteredOrigins()]).toEqual(["http://valido.example"]);
    // preferredOrigin invalido e ignorado: getPreferredAppUrl cai no default.
    expect(getPreferredAppUrl()).toBe(DEFAULT_SITE_NOTES_APP_URL);
  });

  it("segue com o Set vazio quando o storage falha", async () => {
    stubStorage(async () => {
      throw new Error("storage indisponivel");
    });

    await expect(hydrateAppOrigins()).resolves.toBeUndefined();
    expect(getRegisteredOrigins().size).toBe(0);
  });
});

describe("registerAppOrigin", () => {
  it("rejeita origens com protocolo que nao e http/https (normalizeOrigin)", async () => {
    stubStorage(async () => ({}));

    await expect(registerAppOrigin("ftp://example.com")).resolves.toBeNull();
    await expect(registerAppOrigin("nao e uma url")).resolves.toBeNull();
    expect(getRegisteredOrigins().size).toBe(0);
  });

  it("normaliza para a origem (sem path/query) e persiste origins + preferredOrigin", async () => {
    const set = vi.fn(async () => undefined);
    stubStorage(async () => ({}), set);

    const origin = await registerAppOrigin("http://10.0.0.50:4200/references?x=1");

    expect(origin).toBe("http://10.0.0.50:4200");
    expect(getPreferredAppUrl()).toBe("http://10.0.0.50:4200");
    expect(set).toHaveBeenCalledWith({
      "sitenotes.appOrigins": ["http://10.0.0.50:4200"],
      "sitenotes.preferredAppOrigin": "http://10.0.0.50:4200",
    });
  });

  it("aguarda uma hidratacao em curso antes de mutar/persistir, sem perder origens salvas", async () => {
    let resolveGet!: (value: Record<string, unknown>) => void;
    const get = vi.fn(
      () =>
        new Promise<Record<string, unknown>>((resolve) => {
          resolveGet = resolve;
        }),
    );
    const set = vi.fn(async () => undefined);
    stubStorage(get, set);

    // Dispara a hidratacao mas NAO espera ela terminar antes de registrar a origem nova:
    // registerAppOrigin precisa aguardar a mesma promise internamente.
    const hydrate = hydrateAppOrigins();
    const register = registerAppOrigin("http://novo.example:4200/pagina");

    // Storage ainda nao respondeu: nada deveria ter sido persistido ainda.
    expect(set).not.toHaveBeenCalled();

    resolveGet({
      "sitenotes.appOrigins": ["http://existente.example:4200"],
      "sitenotes.preferredAppOrigin": "http://existente.example:4200",
    });

    await hydrate;
    const registeredOrigin = await register;

    expect(registeredOrigin).toBe("http://novo.example:4200");
    expect([...getRegisteredOrigins()].sort()).toEqual(
      ["http://existente.example:4200", "http://novo.example:4200"].sort(),
    );
    // persist() so roda depois do hydrate: o storage final tem as duas origens, nenhuma foi
    // perdida por uma escrita concorrente que so soubesse da origem nova.
    expect(set).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith({
      "sitenotes.appOrigins": expect.arrayContaining([
        "http://existente.example:4200",
        "http://novo.example:4200",
      ]),
      "sitenotes.preferredAppOrigin": "http://novo.example:4200",
    });
  });

  it("segue funcionando (Set em memoria) quando o storage falha ao persistir", async () => {
    stubStorage(
      async () => ({}),
      async () => {
        throw new Error("sem permissao de storage");
      },
    );

    const origin = await registerAppOrigin("http://exemplo.local:4200");

    expect(origin).toBe("http://exemplo.local:4200");
    expect(getPreferredAppUrl()).toBe("http://exemplo.local:4200");
  });
});

describe("resetAppOriginsForTests", () => {
  it("limpa origens, preferencia e a promise de hidratacao memorizada", async () => {
    stubStorage(async () => ({
      "sitenotes.appOrigins": ["http://exemplo.example"],
      "sitenotes.preferredAppOrigin": "http://exemplo.example",
    }));
    await hydrateAppOrigins();
    expect(getRegisteredOrigins().size).toBe(1);

    resetAppOriginsForTests();

    expect(getRegisteredOrigins().size).toBe(0);
    expect(getPreferredAppUrl()).toBe(DEFAULT_SITE_NOTES_APP_URL);

    // hydratePromise foi zerada: uma nova chamada volta a ler o storage.
    const get = vi.fn(async () => ({}));
    stubStorage(get);
    await hydrateAppOrigins();
    expect(get).toHaveBeenCalledTimes(1);
  });
});
