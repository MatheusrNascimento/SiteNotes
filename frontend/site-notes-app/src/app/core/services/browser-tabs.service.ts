import { Injectable } from '@angular/core';
import { OpenTab } from '../models/open-tab.model';

const SOURCE_APP = 'sitenotes-app';
const SOURCE_EXT = 'sitenotes-extension';

@Injectable({ providedIn: 'root' })
export class BrowserTabsService {
  async isAvailable(timeoutMs = 2500): Promise<boolean> {
    if (this.hasBridge()) {
      return true;
    }

    if (await this.waitForBridge(timeoutMs)) {
      return true;
    }

    try {
      await this.request('PING', 'PONG', 800);
      return true;
    } catch {
      return false;
    }
  }

  async getOpenTabs(timeoutMs = 4000): Promise<OpenTab[]> {
    const response = await this.request<{ tabs?: OpenTab[] }>('GET_OPEN_TABS', 'OPEN_TABS', timeoutMs);
    return response.tabs ?? [];
  }

  private hasBridge(): boolean {
    return document.documentElement.getAttribute('data-sitenotes-ext') === '1';
  }

  private waitForBridge(timeoutMs: number): Promise<boolean> {
    if (this.hasBridge()) {
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      const root = document.documentElement;
      const timer = window.setTimeout(() => {
        observer.disconnect();
        resolve(this.hasBridge());
      }, timeoutMs);

      const observer = new MutationObserver(() => {
        if (this.hasBridge()) {
          window.clearTimeout(timer);
          observer.disconnect();
          resolve(true);
        }
      });

      observer.observe(root, { attributes: true, attributeFilter: ['data-sitenotes-ext'] });
    });
  }

  private request<T>(type: string, responseType: string, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestId = crypto.randomUUID();
      const root = document.documentElement;

      const onMessage = (event: MessageEvent) => {
        accept(event.data);
      };

      const onDomChange = () => {
        const raw = root.getAttribute('data-sitenotes-res');
        if (!raw) {
          return;
        }

        try {
          accept(JSON.parse(raw));
        } catch {
          // ignore malformed payloads
        }
      };

      const accept = (data: unknown) => {
        if (!isExtensionResponse(data, responseType, requestId)) {
          return;
        }

        cleanup();
        resolve(data as T);
      };

      const timer = window.setTimeout(() => {
        cleanup();
        reject(new Error('A extensao SiteNotes nao respondeu.'));
      }, timeoutMs);

      const observer = new MutationObserver(onDomChange);

      const cleanup = () => {
        window.clearTimeout(timer);
        window.removeEventListener('message', onMessage);
        observer.disconnect();
      };

      window.addEventListener('message', onMessage);
      observer.observe(root, { attributes: true, attributeFilter: ['data-sitenotes-res'] });

      const payload = { source: SOURCE_APP, type, requestId };
      root.setAttribute('data-sitenotes-req', JSON.stringify(payload));
      window.postMessage(payload, '*');
    });
  }
}

function isExtensionResponse(data: unknown, responseType: string, requestId: string): data is ExtensionResponse {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const payload = data as ExtensionResponse;
  if (payload.source !== SOURCE_EXT || payload.type !== responseType) {
    return false;
  }

  return !payload.requestId || payload.requestId === requestId;
}

interface ExtensionResponse {
  source?: string;
  type?: string;
  requestId?: string;
  tabs?: OpenTab[];
  error?: string | null;
}
