import { TestBed } from '@angular/core/testing';
import {
  AppRequest,
  BRIDGE_ATTRIBUTES,
  BRIDGE_PROTOCOL_VERSION,
  BRIDGE_SOURCE_EXTENSION,
  isAppRequest,
} from '@sitenotes/shared/bridge-protocol';
import { BrowserTabsService } from './browser-tabs.service';

type Reply = Record<string, unknown>;

describe('BrowserTabsService', () => {
  let service: BrowserTabsService;
  let listener: ((event: MessageEvent) => void) | null = null;

  /** Simula o content script: responde cada pedido do app com o que `handler` devolver. */
  function fakeExtension(handler: (request: AppRequest) => Reply[]): void {
    listener = (event: MessageEvent) => {
      if (!isAppRequest(event.data)) {
        return;
      }

      for (const reply of handler(event.data)) {
        window.postMessage(
          { source: BRIDGE_SOURCE_EXTENSION, version: BRIDGE_PROTOCOL_VERSION, ...reply },
          '*',
        );
      }
    };
    window.addEventListener('message', listener);
  }

  beforeEach(() => {
    service = TestBed.inject(BrowserTabsService);
  });

  afterEach(() => {
    if (listener) {
      window.removeEventListener('message', listener);
      listener = null;
    }
    document.documentElement.removeAttribute(BRIDGE_ATTRIBUTES.ready);
    document.documentElement.removeAttribute(BRIDGE_ATTRIBUTES.request);
    document.documentElement.removeAttribute(BRIDGE_ATTRIBUTES.response);
  });

  it('devolve as abas da resposta com o mesmo requestId', async () => {
    const tab = {
      id: 1,
      windowId: 1,
      title: 'A',
      url: 'https://a.com',
      favIconUrl: '',
      active: true,
    };
    fakeExtension((request) => [
      { type: 'OPEN_TABS', requestId: 'outro', tabs: [], error: null },
      { type: 'OPEN_TABS', requestId: request.requestId, tabs: [tab], error: null },
    ]);

    await expect(service.getOpenTabs(1000)).resolves.toEqual([tab]);
  });

  it('rejeita quando a extensao responde com error', async () => {
    fakeExtension((request) => [
      { type: 'OPEN_TABS', requestId: request.requestId, tabs: [], error: 'sem permissao' },
    ]);

    await expect(service.getOpenTabs(1000)).rejects.toThrow('sem permissao');
  });

  it('ignora respostas de outra versao do protocolo e expira', async () => {
    fakeExtension((request) => [
      {
        type: 'OPEN_TABS',
        requestId: request.requestId,
        tabs: [],
        error: null,
        version: BRIDGE_PROTOCOL_VERSION + 1,
      },
    ]);

    await expect(service.getOpenTabs(50)).rejects.toThrow('A extensao SiteNotes nao respondeu.');
  });

  it('nao rejeita o titulo quando a extensao manda error junto com o fallback', async () => {
    fakeExtension((request) => [
      {
        type: 'PAGE_TITLE',
        requestId: request.requestId,
        url: 'https://a.com/',
        title: 'a.com',
        sourceKind: 'fallback',
        error: 'timeout',
      },
    ]);

    await expect(service.resolvePageTitle('https://a.com', 1000)).resolves.toEqual({
      url: 'https://a.com/',
      title: 'a.com',
      source: 'fallback',
    });
  });

  it('considera a extensao disponivel quando o atributo esta correto e o PING responde', async () => {
    document.documentElement.setAttribute(BRIDGE_ATTRIBUTES.ready, String(BRIDGE_PROTOCOL_VERSION));
    fakeExtension((request) => [{ type: 'PONG', requestId: request.requestId }]);

    await expect(service.isAvailable(10)).resolves.toBe(true);
  });

  it('considera a extensao indisponivel quando o atributo esta correto mas o PING nao responde', async () => {
    // Atributo "preso" em true (ex.: extensao desabilitada/atualizada com a aba ainda aberta).
    document.documentElement.setAttribute(BRIDGE_ATTRIBUTES.ready, String(BRIDGE_PROTOCOL_VERSION));

    await expect(service.isAvailable(10)).resolves.toBe(false);
  });

  it('considera a extensao indisponivel quando ninguem responde', async () => {
    document.documentElement.setAttribute(BRIDGE_ATTRIBUTES.ready, '0');

    await expect(service.isAvailable(10)).resolves.toBe(false);
  });
});
