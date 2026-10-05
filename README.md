# SiteNotes

Bloco de notas para guardar referencias de sites/paginas que voce leu ou assistiu e quer manter como referencia, com um "diario" de rascunhos/anotacoes datadas vinculado a cada site.

A ideia de uso: abra o site em uma janela e o SiteNotes em outra, lado a lado, e vá registrando anotacoes conforme le/assiste o conteudo.

## Estrutura do projeto

```
SiteNotes/
  backend/
    SiteNotes.Domain/          Dominio rico: agregados, value objects e servicos de dominio
    SiteNotes.Application/     Casos de uso em servicos de aplicacao
    SiteNotes.Infrastructure/  PostgreSQL 17 (EF Core + Npgsql, migrations)
    SiteNotes.Api/             API REST em ASP.NET Core (.NET 10)
    SiteNotes.Tests/           Testes de unidade com xUnit
  frontend/
    site-notes-app/            SPA em Angular
  extension/                   Extensao Chrome/Edge/Firefox: abas abertas e titulo da URL
  shared/                      Contrato da ponte app/extensao e regras de URL usadas pelos dois
  docs/auditoria/              Auditoria de codigo e arquitetura, com problemas e solucoes
```

O desenho do backend, as entidades e o jeito de acrescentar regra de negocio estao em [backend/docs/arquitetura-e-dominio.md](backend/docs/arquitetura-e-dominio.md).

A auditoria de codigo e arquitetura esta em [docs/auditoria/01-problemas.md](docs/auditoria/01-problemas.md), e as solucoes, com o status de cada item, em [docs/auditoria/02-solucoes.md](docs/auditoria/02-solucoes.md).

## Testes e build

O `package.json` da raiz so tem scripts que chamam cada parte; as dependencias continuam em `frontend/site-notes-app` e `extension`.

```powershell
npm run setup            # npm ci no frontend e na extensao
npm test                 # testes do backend, do frontend e da extensao
npm run build            # build do backend e do frontend, e empacotamento da extensao
npm run pack:extension   # so a extensao: typecheck e build em extension/dist/chrome e extension/dist/firefox
```

Cada parte tambem roda sozinha, por exemplo `dotnet test backend/SiteNotes.slnx`. A CI (`.github/workflows/ci.yml`) roda build e testes do backend, e lint, testes e build do frontend e da extensao.

## Pre-requisitos

- [.NET SDK 10](https://dotnet.microsoft.com/download)
- [Node.js 24](https://nodejs.org/) (inclui npm), a mesma versao da CI e do Dockerfile do frontend
- PostgreSQL 17 rodando localmente na porta padrao (`5432`)
  - Instalacao local: https://www.postgresql.org/download/
  - Ou via Docker:

    ```bash
    docker run -d --name sitenotes-postgres -p 5432:5432 \
      -e POSTGRES_USER=sitenotes -e POSTGRES_PASSWORD=sitenotes_local_dev -e POSTGRES_DB=sitenotes \
      postgres:17.11
    ```

O esquema e criado por migrations do EF Core. Em `Development` (e no Docker Compose, que roda a API em `Development` de proposito) a API aplica as migrations ao subir (`Database:ApplyMigrationsOnStartup`). Em outros ambientes a flag e ignorada e as migrations precisam ser aplicadas manualmente:

```powershell
dotnet tool install --global dotnet-ef   # uma vez
dotnet ef database update --project backend/SiteNotes.Infrastructure --startup-project backend/SiteNotes.Api
```

Para criar uma nova migration depois de alterar as entidades:

```powershell
dotnet ef migrations add NomeDaMigration --project backend/SiteNotes.Infrastructure --startup-project backend/SiteNotes.Api --output-dir Persistence/Migrations
```

## Rodando com Docker (WSL / Linux)

Requer Docker Engine + Compose v2 (Docker Desktop com WSL2, ou Docker nativo no Linux/WSL).

No Compose, **frontend**, **api** e **postgres** falam entre si pela rede Docker `sitenotes` (hostnames `frontend`, `api`, `postgres`). Nao e preciso informar o IP da maquina para essa comunicacao interna.

So o **frontend** e publicado no host (porta `FRONTEND_HOST_PORT`, padrao `4200`). A API e o Postgres **nao** sao publicados: o nginx dentro do container do frontend faz proxy de `/api/` para `http://api:8080`.

```bash
cp .env.example .env   # opcional; os defaults ja funcionam
docker compose up --build -d
```

| Servico    | Dentro do Docker              | No host / rede                          |
| ---------- | ----------------------------- | --------------------------------------- |
| Frontend   | container `frontend:80`       | `http://localhost:4200` (ou IP da maquina) |
| API        | `http://api:8080`             | nao exposta                             |
| PostgreSQL | `postgres:5432`               | nao exposto                             |

### Acesso pela rede (outra maquina)

1. Suba o Compose na maquina servidor e libere a porta `FRONTEND_HOST_PORT` (padrao `4200`) no firewall.
2. No cliente, abra `http://<IP-da-maquina>:4200` (ex.: `http://10.0.0.50:4200`).
3. Instale a extensao no navegador do **cliente** (`extension/dist/chrome` ou `firefox`) e recarregue o SiteNotes. A ponte reconhece o app pelo marcador na pagina — nao e preciso rebuildar a extensao para cada IP/hostname.
4. Opcional: nginx do host na porta 80 apontando para `127.0.0.1:4200` — ha um exemplo em [`nginx/sitenotes.conf`](nginx/sitenotes.conf). Ai o acesso fica `http://sitenotes/` ou `http://<IP>/`, desde que o nome resolva para o IP da maquina (`/etc/hosts` ou DNS local).

O IP/hostname da maquina so importa para o **cliente** (browser) e para o `server_name` do nginx do host. Nao entre na connection string nem no `API_BASE_URL` do Compose (que usa `/api` relativo). A API e o Postgres continuam so na rede Docker.

`FRONTEND_ORIGIN` no `.env` so precisa ser o IP/hostname do frontend se o browser chamar a API em **outra origem** (URL absoluta). Com o proxy `/api` do Compose, o padrao `http://localhost:4200` basta.

Para inspecionar API ou Postgres no host, descomente os blocos `ports` no `docker-compose.yml` e, se quiser, `API_HOST_PORT` / `POSTGRES_HOST_PORT` no `.env`.

As imagens usam tags com patch fixo (`postgres:17.11`, `dotnet/sdk:10.0.401`, `dotnet/aspnet:10.0.12`, `node:24.21.0-alpine`, `nginx:1.30.5-alpine`). Atualizar uma delas e um commit explicito.

O frontend nao espera a API: se ela ainda estiver subindo, o app mostra um aviso e funciona assim que a API responder. A saude da API (dentro da rede Docker) fica em `http://api:8080/health`; pelo frontend publicado: `http://localhost:4200/api/...` (mesmo proxy).

Para parar: `docker compose down`. Para apagar tambem o volume do banco: `docker compose down -v`.

Credenciais do PostgreSQL ficam no `.env` (nao versionado). Se voce mudar usuario/senha depois do primeiro start, remova o volume (`-v`) para o Postgres reinicializar.

## Rodando o backend (API)

```powershell
cd backend/SiteNotes.Api
dotnet run
```

A API sobe por padrao em `http://localhost:5210` (definido em `Properties/launchSettings.json`). Em `Development` o documento OpenAPI fica em `http://localhost:5210/openapi/v1.json`.

A connection string do PostgreSQL fica em `appsettings.json`:

```json
{
  "ConnectionStrings": {
    "Postgres": "Host=localhost;Port=5432;Database=sitenotes;Username=sitenotes;Password=sitenotes_local_dev"
  },
  "Database": {
    "ApplyMigrationsOnStartup": false
  }
}
```

Ajuste esses valores se o seu PostgreSQL estiver em outro host/porta ou com outras credenciais (de preferencia via user-secrets ou variavel de ambiente `ConnectionStrings__Postgres`).

Os ids de referencias e anotacoes sao numericos (`bigint`), gerados pelo banco.

## Rodando o frontend (Angular)

```powershell
cd frontend/site-notes-app
npm ci
npm start
npm test -- --watch=false   # testes com Vitest
npm run lint && npm run format:check
```

O Angular sobe em `http://localhost:4200` e ja esta configurado (CORS no backend, URL da API no frontend) para conversar com a API em `http://localhost:5210/api`.

Se voce mudar a porta da API fora do Docker, atualize também:
- `backend/SiteNotes.Api/appsettings.json` -> `Cors:AllowedOrigins`
- `frontend/site-notes-app/src/environments/environment.development.ts` (e `environment.ts` para o build de producao) -> `apiBaseUrl`
- No Docker Compose o frontend ja usa `API_BASE_URL=/api` (proxy no nginx do container); so o `FRONTEND_HOST_PORT` e publicado no host

A extensao reconhece o SiteNotes pelo atributo `data-sitenotes-app` no HTML (qualquer host/IP/porta). Em desenvolvimento local, `localhost:4200` e `127.0.0.1:4200` tambem entram na allowlist. Depois de abrir o app uma vez, o popup da extensao aponta para a ultima origem usada.

## Extensao do navegador (abas abertas e titulo)

Uma pagina web nao consegue listar as outras abas nem buscar o HTML de sites arbitrarios por seguranca/CORS. A extensao em `extension/` faz essa ponte com o Chrome, o Edge ou o Firefox: lista abas e resolve o titulo da URL (YouTube oEmbed ou parse de HTML).

Os fontes ficam em `extension/src` (TypeScript) e o navegador carrega o resultado do build. O build gera uma pasta por navegador, `extension/dist/chrome` e `extension/dist/firefox`, cada uma com o manifest que aquele navegador entende (`extension/manifests/base.json` mais o ajuste do navegador):

```bash
cd extension
npm ci
npm run build      # gera extension/dist/chrome e extension/dist/firefox (npm run watch no desenvolvimento)
npm test           # testes da resolucao de titulo, das mensagens e dos manifests
npm run lint && npm run typecheck
```

Da raiz, `npm run pack:extension` faz o typecheck e o build de uma vez. As pastas em `dist/` sao o pacote: carregue a do seu navegador como abaixo. Depois de mudar o codigo, gere de novo e recarregue a extensao no navegador.

**Chrome / Edge**

1. Abra `chrome://extensions` ou `edge://extensions`.
2. Ative **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactacao** e escolha a pasta `extension/dist/chrome` deste repositorio.
4. Abra o SiteNotes em `http://localhost:4200` (ou `http://<IP-do-host>:4200` em outro PC) **no mesmo navegador**.

**Firefox**

1. Na barra de endereco, abra `about:debugging#/runtime/this-firefox`.
2. Clique em **Carregar extensao temporaria...** (Load Temporary Add-on).
3. Selecione o arquivo `extension/dist/firefox/manifest.json` deste repositorio.
4. Se a extensao ja estava carregada, clique em **Recarregar**.
5. Recarregue o SiteNotes em `http://localhost:4200` (ou `http://<IP-do-host>:4200`) **no mesmo Firefox**.

No Firefox estavel a extensao temporaria some quando o navegador fecha. Na proxima sessao, repetir os passos 1-4. Para manter instalada, use o Firefox Developer Edition ou o Nightly.

Ao abrir o app, o SiteNotes pergunta qual aba voce deseja anotar. O titulo da referencia e resolvido no cliente (extensao) e enviado pronto para o backend salvar. Voce tambem pode clicar em **A partir de uma aba** a qualquer momento.

## Uso

1. Rode o backend e o frontend (ver acima) e instale a extensao (recomendada para titulo automatico).
2. Abra `http://localhost:4200` e, se a extensao estiver ativa, escolha a aba que deseja anotar.
3. Sem a extensao, clique em **"+ Novo site"** e cole a URL: informe o titulo manualmente ou deixe o host/URL como fallback.
4. Clique na referencia cadastrada para abrir a tela de detalhe, onde voce pode:
   - Abrir o site em uma nova aba a qualquer momento.
   - Editar a URL, o titulo e as tags da referencia.
   - Adicionar quantos rascunhos/anotacoes quiser, cada um com data/hora.
   - Editar ou excluir anotacoes antigas.
5. Use a busca e o filtro por tag na tela inicial para encontrar referencias antigas rapidamente.

## Endpoints da API

| Metodo | Rota | Descricao |
| --- | --- | --- |
| GET | `/api/references?search=&tag=&skip=&take=` | Lista referencias, com busca por titulo/url, filtro por tag e paginacao |
| GET | `/api/references/{id}` | Detalhe de uma referencia |
| POST | `/api/references` | Cria uma referencia (`url`, `title`, `tags`) |
| PUT | `/api/references/{id}` | Atualiza uma referencia |
| DELETE | `/api/references/{id}` | Remove uma referencia (e suas anotacoes) |
| GET | `/api/references/{id}/notes?skip=&take=` | Lista as anotacoes de uma referencia, com paginacao |
| POST | `/api/references/{id}/notes` | Adiciona uma anotacao a uma referencia |
| GET | `/api/notes/{id}` | Detalhe de uma anotacao |
| PUT | `/api/notes/{id}` | Atualiza uma anotacao |
| DELETE | `/api/notes/{id}` | Remove uma anotacao |
| GET | `/health` | Saude da API e da conexao com o banco |

Paginacao: `skip` e `take` sao opcionais. Sem `take` a lista vem inteira; com `take`, o maximo e 200. Valores negativos, `take` acima de 200 ou nao numericos devolvem `400` com `ProblemDetails`. Referencias vem ordenadas pela ultima atualizacao e anotacoes pela data de criacao, da mais recente para a mais antiga, com o id como desempate.

Erros de validacao e de regra de negocio voltam como `ProblemDetails` (`400`), e recursos inexistentes como `404`.
