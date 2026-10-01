import { describe, expect, it } from "vitest";
import base from "../manifests/base.json";
import chrome from "../manifests/chrome.json";
import firefox from "../manifests/firefox.json";
import pkg from "../package.json";

type Manifest = Record<string, unknown>;

describe("manifests", () => {
  it("deixa background e ajustes de navegador fora do manifest base", () => {
    expect((base as Manifest).background).toBeUndefined();
    expect((base as Manifest).browser_specific_settings).toBeUndefined();
  });

  it("Chrome usa so service_worker e Firefox so scripts", () => {
    expect(chrome.background).toEqual({ service_worker: "background.js" });
    expect((chrome as Manifest).browser_specific_settings).toBeUndefined();
    expect(firefox.background).toEqual({ scripts: ["background.js"] });
    expect(firefox.browser_specific_settings.gecko.id).toBeTruthy();
  });

  it("mantem a versao do manifest igual a do package.json", () => {
    expect(base.version).toBe(pkg.version);
  });
});
