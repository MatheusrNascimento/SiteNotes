import { describe, expect, it } from "vitest";
import { SITE_NOTES_APP_URL, isSiteNotesAppUrl } from "../src/site-notes-app";

describe("isSiteNotesAppUrl", () => {
  it.each(["http://localhost:4200/references", "http://127.0.0.1:4200/", "https://localhost:4200"])(
    "reconhece o app em %s",
    (url) => {
      expect(isSiteNotesAppUrl(url)).toBe(true);
    },
  );

  it.each([
    "http://localhost:5210/api/references",
    "http://localhost/",
    "http://example.com:4200/",
    "file:///C:/index.html",
    "nao e url",
    undefined,
  ])("ignora %s", (url) => {
    expect(isSiteNotesAppUrl(url)).toBe(false);
  });

  it("o link do popup aponta para uma URL reconhecida", () => {
    expect(isSiteNotesAppUrl(SITE_NOTES_APP_URL)).toBe(true);
  });
});
