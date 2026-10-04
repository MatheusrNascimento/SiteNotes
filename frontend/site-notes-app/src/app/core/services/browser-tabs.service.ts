import { Injectable } from '@angular/core';
import {
  AppRequest,
  AppRequestType,
  BRIDGE_ATTRIBUTES,
  BRIDGE_PROTOCOL_VERSION,
  BRIDGE_SOURCE_APP,
  RESPONSE_TYPE_FOR,
  ResponseFor,
  isExtensionMessage,
} from '@sitenotes/shared/bridge-protocol';
import { OpenTab } from '../models/open-tab.model';
import { PageMetadata } from '../models/page-metadata.model';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type RequestBody = DistributiveOmit<AppRequest, 'source' | 'version' | 'requestId'>;

const BRIDGE_WAIT_TIMEOUT_MS = 2500;
const PING_TIMEOUT_MS = 800;
const OPEN_TABS_TIMEOUT_MS = 4000;
/** A extensao baixa a pagina (ou o oEmbed do YouTube) para ler o titulo. */
const PAGE_TITLE_TIMEOUT_MS = 10000;

/** `crypto.randomUUID` so existe em contexto seguro (HTTPS ou localhost); `getRandomValues` existe sempre. */
function newRequestId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

@Injectable({ providedIn: 'root' })
export class BrowserTabsService {
  async isAvailable(timeoutMs = BRIDGE_WAIT_TIMEOUT_MS): Promise<boolean> {
    if (this.hasBridge()) {
      return true;
    }

    if (await this.waitForBridge(timeoutMs)) {
      return true;
    }

    try {
      await this.request({ type: 'PING' }, PING_TIMEOUT_MS);
      return true;
    } catch {
      return false;
    }
  }

  async getOpenTabs(timeoutMs = OPEN_TABS_TIMEOUT_MS): Promise<OpenTab[]> {
    const response = await this.request({ type: 'GET_OPEN_TABS' }, timeoutMs);
    if (response.error) {
      throw new Error(response.error);
    }

    return response.tabs ?? [];
  }

  /** Um `error` na resposta nao rejeita: a extensao ja devolve um titulo de fallback nesse caso. */
  async resolvePageTitle(url: string, timeoutMs = PAGE_TITLE_TIMEOUT_MS): Promise<PageMetadata> {
    const response = await this.request({ type: 'RESOLVE_PAGE_TITLE', url }, timeoutMs);

    return {
      url: response.url || url,
      title: response.title || '',
      source: response.sourceKind || 'fallback',
    };
  }

  private hasBridge(): boolean {
    return (
      document.documentElement.getAttribute(BRIDGE_ATTRIBUTES.ready) ===
      String(BRIDGE_PROTOCOL_VERSION)
    );
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

      observer.observe(root, { attributes: true, attributeFilter: [BRIDGE_ATTRIBUTES.ready] });
    });
  }

  private request<B extends RequestBody>(
    body: B,
    timeoutMs: number,
  ): Promise<ResponseFor<B['type'] & AppRequestType>> {
    type Response = ResponseFor<B['type'] & AppRequestType>;
    const responseType = RESPONSE_TYPE_FOR[body.type];

    return new Promise((resolve, reject) => {
      const requestId = newRequestId();
      const root = document.documentElement;

      const onMessage = (event: MessageEvent) => {
        accept(event.data);
      };

      const onDomChange = () => {
        const raw = root.getAttribute(BRIDGE_ATTRIBUTES.response);
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
        if (
          !isExtensionMessage(data) ||
          data.type !== responseType ||
          !('requestId' in data) ||
          data.requestId !== requestId
        ) {
          return;
        }

        cleanup();
        resolve(data as Response);
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
      observer.observe(root, { attributes: true, attributeFilter: [BRIDGE_ATTRIBUTES.response] });

      const payload = {
        ...body,
        source: BRIDGE_SOURCE_APP,
        version: BRIDGE_PROTOCOL_VERSION,
        requestId,
      } as AppRequest;
      root.setAttribute(BRIDGE_ATTRIBUTES.request, JSON.stringify(payload));
      window.postMessage(payload, '*');
    });
  }
}
