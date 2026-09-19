const api = globalThis.browser ?? globalThis.chrome;
const SOURCE_APP = "sitenotes-app";
const SOURCE_EXT = "sitenotes-extension";

if (!globalThis.__sitenotesContentLoaded) {
  globalThis.__sitenotesContentLoaded = true;
  installBridge();
}

markPage();

let lastRequestId = null;

function installBridge() {
  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || data.source !== SOURCE_APP) {
      return;
    }

    handleAppRequest(data);
  });

  const root = document.documentElement;
  if (root) {
    const observer = new MutationObserver(() => {
      const raw = root.getAttribute("data-sitenotes-req");
      if (!raw) {
        return;
      }

      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        return;
      }

      if (!data || data.source !== SOURCE_APP) {
        return;
      }

      handleAppRequest(data);
    });

    observer.observe(root, { attributes: true, attributeFilter: ["data-sitenotes-req"] });
  }
}

function markPage() {
  const root = document.documentElement;
  if (!root) {
    return;
  }

  root.setAttribute("data-sitenotes-ext", "1");
  postToPage({ source: SOURCE_EXT, type: "READY" });
}

function handleAppRequest(data) {
  const { type, requestId } = data;
  if (requestId && requestId === lastRequestId) {
    return;
  }

  lastRequestId = requestId || null;

  if (type === "PING") {
    respond({ source: SOURCE_EXT, type: "PONG", requestId });
    return;
  }

  if (type !== "GET_OPEN_TABS") {
    return;
  }

  sendRuntimeMessage({ type: "GET_OPEN_TABS" })
    .then((response) => {
      respond({
        source: SOURCE_EXT,
        type: "OPEN_TABS",
        requestId,
        tabs: response?.tabs || [],
        error: response?.error || null,
      });
    })
    .catch((error) => {
      respond({
        source: SOURCE_EXT,
        type: "OPEN_TABS",
        requestId,
        tabs: [],
        error: error?.message || String(error),
      });
    });
}

function respond(payload) {
  postToPage(payload);

  const root = document.documentElement;
  if (!root) {
    return;
  }

  const serialized = JSON.stringify(payload);
  root.removeAttribute("data-sitenotes-res");
  root.setAttribute("data-sitenotes-res", serialized);
}

function postToPage(payload) {
  window.postMessage(payload, "*");
}

function sendRuntimeMessage(message) {
  const result = api.runtime.sendMessage(message);
  if (result && typeof result.then === "function") {
    return result;
  }

  return new Promise((resolve, reject) => {
    api.runtime.sendMessage(message, (response) => {
      const err = api.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }

      resolve(response);
    });
  });
}
