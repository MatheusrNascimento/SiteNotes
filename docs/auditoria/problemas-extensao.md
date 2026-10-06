---
name: Bugs e melhorias na extensão
overview: Revisão da lógica da extensão e da ponte com o Angular identificou 3 bugs reais (condições de corrida que perdem dados ou title errado) e várias melhorias de robustez/performance, com correções pontuais e de baixo risco.
todos:
  - id: fix-origin-race
    content: Corrigir corrida hydrateAppOrigins/registerAppOrigin em extension/src/app-origins.ts usando Promise compartilhada de hidratação
    status: pending
  - id: fix-title-lookup-race
    content: Corrigir corrida de lookup de título em add-reference-form.ts comparando URL atual antes de aplicar resultado
    status: pending
  - id: fix-youtube-fallback
    content: Isolar try/catch do oEmbed do YouTube em page-title.ts para permitir fallback ao parse de HTML
    status: pending
  - id: improve-isavailable-ping
    content: Fazer isAvailable() confirmar com PING mesmo quando o atributo DOM já existe
    status: pending
  - id: reduce-reinjection
    content: Restringir reinjeção do content script em background.ts a status 'complete'
    status: pending
  - id: restrict-postmessage-origin
    content: Restringir targetOrigin do postMessage e validar event.origin em content.ts e browser-tabs.service.ts
    status: pending
  - id: fix-ssrf-redirect
    content: Revalidar host final (response.url) após fetch em page-title.ts para evitar SSRF via redirect
    status: pending
  - id: align-fallback-title
    content: Alinhar fallback de título (usar url) entre background.ts e content.ts em caso de erro de mensageria
    status: pending
isProject: false
---


# Bugs e melhorias na extensão SiteNotes

Revisei `extension/src/*`, `shared/bridge-protocol.ts`, `shared/url-rules.ts` e o lado Angular (`browser-tabs.service.ts`, `page-metadata.service.ts`, `reference-creator.service.ts`, `add-reference-form.ts`, `reference-list.ts`). Os pontos abaixo foram confirmados lendo o código (não é só heurística).

## Bugs confirmados (alta prioridade)

### 1. Corrida em `hydrateAppOrigins` x `registerAppOrigin` perde origens salvas

`extension/src/app-origins.ts`:

```44:90:extension/src/app-origins.ts
export async function hydrateAppOrigins(): Promise<void> {
  if (hydrated) {
    return;
  }

  hydrated = true;                 // marca "feito" antes do await resolver
  try {
    const stored = await api.storage.local.get([STORAGE_KEY, PREFERRED_KEY]);
    ...
  }
}
...
export async function registerAppOrigin(rawOrigin: string): Promise<string | null> {
  ...
  origins.add(origin);
  preferredOrigin = origin;
  await persist();                 // sobrescreve o storage com o Set atual
  return origin;
}
```

`persist()` faz `storage.local.set({ [STORAGE_KEY]: [...origins] })` — um **overwrite completo**, não um merge. Se o content script chamar `REGISTER_APP_ORIGIN` (ao abrir o app) antes do `await api.storage.local.get(...)` do hydrate terminar, `persist()` grava só a origem nova e **as origens persistidas de sessões anteriores somem do storage** (o merge em memória acontece depois, mas nunca é re-persistido).

**Correção:** trocar o booleano `hydrated` por uma Promise compartilhada que `registerAppOrigin` aguarda antes de mexer no `Set`/persistir.

### 2. Lookup de título na adição manual de referência tem corrida (título errado aplicado)

`frontend/site-notes-app/src/app/references/add-reference-form/add-reference-form.ts`:

```64:86:frontend/.../add-reference-form.ts
private cancelTitleLookup(): void {
  if (this.titleLookupHandle) {
    clearTimeout(this.titleLookupHandle);   // só cancela o debounce, não a busca já em voo
    this.titleLookupHandle = null;
  }
}

private async lookupTitleFromUrl(url: string): Promise<void> {
  ...
  const title = await this.creator.resolveTitle(trimmed, '');
  if (!this.title().trim() && title) {      // não verifica se a URL mudou enquanto aguardava
    this.title.set(title);
  }
}
```

Cenário: usuário digita URL A, a busca dispara (pode levar até 10s, ver `PAGE_TITLE_TIMEOUT_MS`), troca para URL B antes de A terminar. A busca de B pode responder mais rápido mas vazia; quando a busca de A (mais lenta) retorna depois, o guard só olha se o campo está vazio — e aplica o título de **A** mesmo com a URL **B** no formulário.

**Correção:** comparar a URL atual (`this.url()`) com a URL do lookup antes de aplicar o resultado, descartando respostas de buscas obsoletas.

### 3. Falha no oEmbed do YouTube pula o fallback de HTML

`extension/src/page-title.ts`:

```50:75:extension/src/page-title.ts
try {
  if (extractYouTubeVideoId(address.uri)) {
    const youtubeTitle = await tryReadYouTubeTitle(address.uri);   // se der throw (timeout, rede)...
    if (youtubeTitle) { return { ...source: "youtube" }; }
  }

  const html = await tryReadHtml(address.uri);                     // ...nunca chega aqui
  ...
} catch {
  // cai direto no fallback de hostname
}
```

Se `tryReadYouTubeTitle` lançar exceção (timeout/erro de rede), a execução salta direto para o `catch` externo e nunca tenta `tryReadHtml`, mesmo sendo um caminho de fallback razoável. Resultado: título vira só o hostname (`youtube.com`) em vez de tentar extrair o `<title>`/`og:title` da página.

**Correção:** envolver a chamada do oEmbed em seu próprio `try/catch` que apenas retorna `null` em erro, permitindo cair para `tryReadHtml` normalmente.

## Melhorias de robustez (média prioridade)

### 4. `isAvailable()` confia em atributo DOM que pode ficar "stale"

`browser-tabs.service.ts:73-78` — `hasBridge()` só olha o atributo `data-sitenotes-ext` no `<html>`, setado uma vez pelo content script. Se a extensão for desabilitada/atualizada (contexto invalidado) enquanto a aba do app continua aberta, o atributo permanece e `isAvailable()` reporta `true` indevidamente, fazendo o app esperar até 10s (`PAGE_TITLE_TIMEOUT_MS`) antes de cair no fallback.
**Melhoria:** sempre confirmar com um `PING` leve (800ms) mesmo quando o atributo já existe, não só quando ausente.

### 5. Reinjeção excessiva do content script

`extension/src/background.ts:126-136` — `watchSiteNotesTabs` reinjeta o content script sempre que `status === 'loading'` **ou** `'complete'` **ou** há `info.url`, disparando `scripting.executeScript` 2-3× por navegação na aba do app (mitigado pelo guard `__sitenotesContentLoaded`, mas ainda desperdiça uma chamada de API por evento).
**Melhoria:** reinjetar só em `status === 'complete'`.

### 6. `postMessage` sem origem restrita nos dois lados

`content.ts:182` e `browser-tabs.service.ts:169` usam `postMessage(payload, '*')`, e nenhum dos dois valida `event.origin` ao receber. O `requestId` aleatório + checagem de `source`/`version` mitigam bastante, mas restringir `targetOrigin` para `window.location.origin` e validar `event.origin` no listener fecha a brecha por completo.

### 7. Possível SSRF leve via redirect no fetch de título

`extension/src/page-title.ts:129-137` — o host é validado (`isLocalOrPrivateHost`) antes do fetch, mas `fetch` segue redirects por padrão; um redirect para um host privado não é revalidado.
**Melhoria:** checar `response.url` após o fetch e descartar o conteúdo se o host final também for local/privado.

### 8. Fallback de título inconsistente em erro de mensageria

`background.ts:28-33` (erro ao resolver) devolve `title = url`; `content.ts:130-138` (erro ao falar com o background) devolve `title = ""`. Alinhar os dois para sempre cair no `url` como título mínimo.

## Observações de baixa prioridade (não entram nesta rodada, citar para registro)

- `popup.ts:50` trunca a lista em 8 abas sem indicar que há mais.
- `background.ts:107` ordena por `lastAccessed`, que pode ser `undefined`.
- Faltam testes para `background.ts`, `content.ts`, `popup.ts`, canal DOM da ponte, `PageMetadataService` e a corrida do item 2.
- `manifests/base.json` sem `icons` (relevante só para publicação nas lojas).

## Escopo desta rodada

Implementar os itens 1-8 (bugs altos + melhorias médias). Itens de baixa prioridade ficam de fora, a menos que você peça para incluir.
