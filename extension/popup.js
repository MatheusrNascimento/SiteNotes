const api = globalThis.browser ?? globalThis.chrome;

const statusEl = document.getElementById("status");
const listEl = document.getElementById("tabs");

sendRuntimeMessage({ type: "GET_OPEN_TABS" })
  .then((response) => {
    const tabs = response?.tabs || [];
    if (response?.error) {
      statusEl.textContent = response.error;
      return;
    }

    statusEl.textContent =
      tabs.length === 0
        ? "Nenhuma aba http/https encontrada. Recarregue a extensao e conceda acesso aos sites."
        : `${tabs.length} aba(s) pronta(s) para anotar.`;

    listEl.innerHTML = "";
    for (const tab of tabs.slice(0, 8)) {
      const item = document.createElement("li");
      item.textContent = tab.title || tab.url;
      listEl.appendChild(item);
    }
  })
  .catch((error) => {
    statusEl.textContent = error?.message || String(error);
  });

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
