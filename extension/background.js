const api = globalThis.browser ?? globalThis.chrome;
const SITE_NOTES_HOSTS = new Set(["localhost", "127.0.0.1", "sitenotes"]);
const SITE_NOTES_PORTS = new Set(["", "80", "443", "4200"]);


api.runtime.onMessage.addListener((message) => {
  if (message?.type !== "GET_OPEN_TABS") {
    return;
  }

  return collectOpenTabs();
});

watchSiteNotesTabs();

async function collectOpenTabs() {
  try {
    const tabs = await queryHttpTabs();
    const openTabs = tabs
      .filter(isUsefulTab)
      .sort(compareTabs)
      .map((tab) => ({
        id: tab.id,
        windowId: tab.windowId,
        title: cleanTitle(tab.title || tab.url || ""),
        url: tab.url,
        favIconUrl: tab.favIconUrl || "",
        active: Boolean(tab.active),
      }));

    return { tabs: openTabs };
  } catch (error) {
    return { tabs: [], error: String(error) };
  }
}

async function queryHttpTabs() {
  try {
    const matching = await api.tabs.query({ url: ["http://*/*", "https://*/*"] });
    if (matching.length > 0) {
      return matching;
    }
  } catch {
    // Firefox pode recusar o filtro de URL se a permissao de host ainda nao foi concedida.
  }

  return api.tabs.query({});
}

function isUsefulTab(tab) {
  if (!tab.url) {
    return false;
  }

  try {
    const url = new URL(tab.url);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }

    if (SITE_NOTES_HOSTS.has(url.hostname) && SITE_NOTES_PORTS.has(url.port || "")) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function compareTabs(a, b) {
  if (a.active !== b.active) {
    return a.active ? -1 : 1;
  }

  return (b.lastAccessed || 0) - (a.lastAccessed || 0);
}

function cleanTitle(title) {
  return title.replace(/\s+-\s+YouTube$/i, "").trim();
}

function isSiteNotesUrl(url) {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      SITE_NOTES_HOSTS.has(parsed.hostname)
    );
  } catch {
    return false;
  }
}

async function injectContentScript(tabId) {
  try {
    if (api.scripting?.executeScript) {
      await api.scripting.executeScript({
        target: { tabId },
        files: ["content.js"],
      });
      return;
    }
  } catch {
    // ja injetado ou sem permissao
  }

  try {
    if (api.tabs.executeScript) {
      await api.tabs.executeScript(tabId, { file: "content.js" });
    }
  } catch {
    // ignorar
  }
}

function watchSiteNotesTabs() {
  api.tabs.onUpdated.addListener((tabId, info, tab) => {
    const url = info.url || tab.url;
    if (!isSiteNotesUrl(url)) {
      return;
    }

    if (info.status === "loading" || info.status === "complete" || info.url) {
      injectContentScript(tabId);
    }
  });

  api.tabs.query({}).then((tabs) => {
    for (const tab of tabs) {
      if (tab.id && isSiteNotesUrl(tab.url)) {
        injectContentScript(tab.id);
      }
    }
  });
}
