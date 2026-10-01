// Contrato da ponte entre a pagina do SiteNotes e o content script da extensao.
// As mensagens trafegam por window.postMessage e, em paralelo, pelos atributos de BRIDGE_ATTRIBUTES
// no <html> (o Firefox nem sempre entrega postMessage entre a pagina e o mundo isolado).
// Mudou o formato de alguma mensagem? Incremente BRIDGE_PROTOCOL_VERSION: cada lado ignora
// mensagens de outra versao, e o app trata a extensao desatualizada como indisponivel.

export const BRIDGE_PROTOCOL_VERSION = 1;

export const BRIDGE_SOURCE_APP = 'sitenotes-app';
export const BRIDGE_SOURCE_EXTENSION = 'sitenotes-extension';

export const BRIDGE_ATTRIBUTES = {
  /** Valor: a versao do protocolo que a extensao instalada fala. */
  ready: 'data-sitenotes-ext',
  request: 'data-sitenotes-req',
  response: 'data-sitenotes-res',
} as const;

export type PageTitleSource = 'page' | 'youtube' | 'fallback' | 'blocked-host';

export interface BridgeOpenTab {
  id: number;
  windowId: number;
  title: string;
  url: string;
  favIconUrl: string;
  active: boolean;
}

interface AppEnvelope {
  source: typeof BRIDGE_SOURCE_APP;
  version: number;
  requestId: string;
}

interface ExtensionEnvelope {
  source: typeof BRIDGE_SOURCE_EXTENSION;
  version: number;
}

export type AppRequest = AppEnvelope &
  ({ type: 'PING' } | { type: 'GET_OPEN_TABS' } | { type: 'RESOLVE_PAGE_TITLE'; url: string });

export type ExtensionMessage = ExtensionEnvelope &
  (
    | { type: 'READY' }
    | { type: 'PONG'; requestId: string }
    | { type: 'OPEN_TABS'; requestId: string; tabs: BridgeOpenTab[]; error: string | null }
    | {
        type: 'PAGE_TITLE';
        requestId: string;
        url: string;
        title: string;
        sourceKind: PageTitleSource;
        error: string | null;
      }
  );

export type AppRequestType = AppRequest['type'];

export const RESPONSE_TYPE_FOR = {
  PING: 'PONG',
  GET_OPEN_TABS: 'OPEN_TABS',
  RESOLVE_PAGE_TITLE: 'PAGE_TITLE',
} as const satisfies Record<AppRequestType, ExtensionMessage['type']>;

export type ResponseFor<T extends AppRequestType> = Extract<
  ExtensionMessage,
  { type: (typeof RESPONSE_TYPE_FOR)[T] }
>;

export function isAppRequest(data: unknown): data is AppRequest {
  return hasEnvelope(data, BRIDGE_SOURCE_APP) && typeof data['requestId'] === 'string';
}

export function isExtensionMessage(data: unknown): data is ExtensionMessage {
  return hasEnvelope(data, BRIDGE_SOURCE_EXTENSION);
}

function hasEnvelope(data: unknown, source: string): data is Record<string, unknown> {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const payload = data as Record<string, unknown>;
  return (
    payload['source'] === source &&
    payload['version'] === BRIDGE_PROTOCOL_VERSION &&
    typeof payload['type'] === 'string'
  );
}
