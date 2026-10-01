import { afterEach, describe, expect, it, vi } from "vitest";
import { extractHtmlTitle, normalizePageTitle, resolvePageTitle } from "../src/page-title";

function htmlResponse(body: string, contentType = "text/html; charset=utf-8"): Response {
  return new Response(body, { status: 200, headers: { "content-type": contentType } });
}

describe("normalizePageTitle", () => {
  it("colapsa espacos, decodifica entidades e tira o sufixo do YouTube", () => {
    expect(normalizePageTitle("  Tom &amp; Jerry\u00a0 -  YouTube ")).toBe("Tom & Jerry");
  });
});

describe("extractHtmlTitle", () => {
  it("prefere og:title, depois twitter:title, depois h1 e por fim <title>", () => {
    const full =
      '<meta property="og:title" content="OG"><meta name="twitter:title" content="TW">' +
      "<h1>H1</h1><title>Doc</title>";
    expect(extractHtmlTitle(full)).toBe("OG");
    expect(extractHtmlTitle('<meta content="TW" name="twitter:title"><title>Doc</title>')).toBe("TW");
    expect(extractHtmlTitle("<h1>Ola <em>mundo</em></h1><title>Doc</title>")).toBe("Ola mundo");
    expect(extractHtmlTitle("<title>Doc</title>")).toBe("Doc");
  });

  it("devolve null quando nao ha titulo", () => {
    expect(extractHtmlTitle("<p>sem titulo</p>")).toBeNull();
  });
});

describe("resolvePageTitle", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("devolve fallback com erro para URL invalida", async () => {
    const result = await resolvePageTitle("ftp://example.com");
    expect(result.source).toBe("fallback");
    expect(result.error).toMatch(/Url invalida/);
  });

  it.each(["http://localhost:3000/", "http://192.168.0.10/", "http://[fd00::1]/", "http://nas.local/"])(
    "nao busca hosts locais (%s)",
    async (url) => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      const result = await resolvePageTitle(url);

      expect(result.source).toBe("blocked-host");
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("usa o oEmbed para videos do YouTube", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ title: "Video - YouTube" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await resolvePageTitle("https://youtu.be/abc123");

    expect(result).toMatchObject({ source: "youtube", title: "Video" });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("youtube.com/oembed");
  });

  it("le o titulo do HTML da pagina", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(htmlResponse("<title>Artigo</title>")));

    const result = await resolvePageTitle("https://example.com/post");

    expect(result).toEqual({ url: "https://example.com/post", title: "Artigo", source: "page" });
  });

  it("ignora respostas que nao sao HTML e cai no host", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(htmlResponse("{}", "application/json")));

    const result = await resolvePageTitle("https://www.example.com/api");

    expect(result).toMatchObject({ source: "fallback", title: "example.com" });
  });

  it("cai no host quando o fetch falha", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));

    const result = await resolvePageTitle("https://example.com/");

    expect(result).toMatchObject({ source: "fallback", title: "example.com" });
  });
});
