import { sendRuntimeMessage } from "./messaging";
import { errorMessage } from "./page-title";
import { DEFAULT_SITE_NOTES_APP_URL } from "./site-notes-app";

interface OpenTabsResponse {
  tabs?: { title?: string; url?: string }[];
  error?: string;
}

interface AppUrlResponse {
  url?: string;
}

const statusEl = document.getElementById("status")!;
const listEl = document.getElementById("tabs")!;
const appLink = document.getElementById("app-link") as HTMLAnchorElement;

function setAppLink(url: string): void {
  appLink.href = url;
  appLink.textContent = url;
}

setAppLink(DEFAULT_SITE_NOTES_APP_URL);

sendRuntimeMessage<AppUrlResponse>({ type: "GET_APP_URL" })
  .then((response) => {
    const url = response?.url?.trim();
    if (url) {
      setAppLink(url);
    }
  })
  .catch(() => {
    // Mantem o fallback localhost:4200.
  });

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
