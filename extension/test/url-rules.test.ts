import { describe, expect, it } from "vitest";
import {
  extractYouTubeVideoId,
  hostTitle,
  isLocalOrPrivateHost,
  normalizeTitleText,
} from "../../shared/url-rules";

describe("extractYouTubeVideoId", () => {
  it.each([
    ["https://www.youtube.com/watch?v=abc", "abc"],
    ["https://youtu.be/abc?t=10", "abc"],
    ["https://m.youtube.com/shorts/abc", "abc"],
    ["https://music.youtube.com/embed/abc", "abc"],
    ["https://youtube.com/live/abc", "abc"],
  ])("reconhece %s", (url, id) => {
    expect(extractYouTubeVideoId(new URL(url))).toBe(id);
  });

  it.each(["https://www.youtube.com/", "https://youtube.com/channel/x", "https://example.com/?v=abc"])(
    "devolve null para %s",
    (url) => {
      expect(extractYouTubeVideoId(new URL(url))).toBeNull();
    },
  );
});

describe("isLocalOrPrivateHost", () => {
  it.each([
    "http://localhost/",
    "http://nas.local/",
    "http://svc.internal/",
    "http://0.0.0.0/",
    "http://127.0.0.1/",
    "http://10.1.2.3/",
    "http://172.16.0.1/",
    "http://172.31.255.255/",
    "http://192.168.1.1/",
    "http://169.254.0.1/",
    "http://[::1]/",
    "http://[fd00::1]/",
    "http://[fe80::1]/",
  ])("bloqueia %s", (url) => {
    expect(isLocalOrPrivateHost(new URL(url))).toBe(true);
  });

  it.each(["https://example.com/", "http://172.32.0.1/", "https://fdroid.org/", "https://fc.example/"])(
    "libera %s",
    (url) => {
      expect(isLocalOrPrivateHost(new URL(url))).toBe(false);
    },
  );
});

describe("hostTitle e normalizeTitleText", () => {
  it("tira o www do host", () => {
    expect(hostTitle(new URL("https://www.example.com/a"))).toBe("example.com");
  });

  it("colapsa espacos e tira o sufixo do YouTube", () => {
    expect(normalizeTitleText("  Meu\n video  -   YouTube  ")).toBe("Meu video");
  });
});
