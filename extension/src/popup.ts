import { sendRuntimeMessage } from "./messaging";
import { errorMessage } from "./page-title";

interface OpenTabsResponse {
  tabs?: { title?: string; url?: string }[];
  error?: string;
}

const statusEl = document.getElementById("status")!;
const listEl = document.getElementById("tabs")!;

sendRuntimeMessage<OpenTabsResponse>({ type: "GET_OPEN_TABS" })
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
      item.textContent = tab.title || tab.url || "";
      listEl.appendChild(item);
    }
  })
  .catch((error: unknown) => {
    statusEl.textContent = errorMessage(error);
  });