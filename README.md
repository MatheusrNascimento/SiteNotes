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
```

O desenho do backend, as entidades e o jeito de acrescentar regra de negocio estao em [backend/docs/arquitetura-e-dominio.md](backend/docs/arquitetura-e-dominio.md).

## Testes do backend

```powershell
dotnet test backend/SiteNotes.slnx
```

## Pre-requisitos

- [.NET SDK 10](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/) (inclui npm)
- PostgreSQL 17 rodando localmente na porta padrao (`5432`)
  - Instalacao local: https://www.postgresql.org/download/
  - Ou via Docker:

    ```bash
    docker run -d --name sitenotes-postgres -p 5432:5432 \
      -e POSTGRES_USER=sitenotes -e POSTGRES_PASSWORD=sitenotes_local_dev -e POSTGRES_DB=sitenotes \
      postgres:17
    ```

O esquema e criado por migrations do EF Core. Em `Development` (e no Docker Compose) a API aplica as migrations ao subir (`Database:ApplyMigrationsOnStartup`). Em outros ambientes a flag e ignorada e as migrations precisam ser aplicadas manualmente:

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

```bash
cp .env.example .env   # opcional; os defaults ja funcionam
docker compose up --build
```

Servicos:

| Servico   | URL / porta              |
| --------- | ------------------------ |
| Frontend  | http://localhost:4200    |
| API       | http://localhost:5210    |
| PostgreSQL | localhost:5432          |

Para parar: `docker compose down`. Para apagar tambem o volume do banco: `docker compose down -v`.

Credenciais do PostgreSQL ficam no `.env` (nao versionado). Se voce mudar usuario/senha depois do primeiro start, remova o volume (`-v`) para o Postgres reinicializar.

## Rodando o backend (API)

```powershell
cd backend/SiteNotes.Api
dotnet run
```

A API sobe por padrao em `http://localhost:5210` (definido em `Properties/launchSettings.json`).

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
npm install
npm start
```

O Angular sobe em `http://localhost:4200` e ja esta configurado (CORS no backend, URL da API no frontend) para conversar com a API em `http://localhost:5210/api`.

Se voce mudar a porta da API, atualize também:
- `backend/SiteNotes.Api/appsettings.json` -> `Cors:AllowedOrigins`
- `frontend/site-notes-app/src/environments/environment.development.ts` (e `environment.ts` para o build de producao) -> `apiBaseUrl`
- No Docker Compose basta mudar `API_HOST_PORT` no `.env`: o build do frontend recebe a URL pelo build arg `API_BASE_URL`

## Extensao do navegador (abas abertas e titulo)

Uma pagina web nao consegue listar as outras abas nem buscar o HTML de sites arbitrarios por seguranca/CORS. A extensao em `extension/` faz essa ponte com o Chrome, o Edge ou o Firefox: lista abas e resolve o titulo da URL (YouTube oEmbed ou parse de HTML).

Os fontes ficam em `extension/src` (TypeScript) e o navegador carrega o resultado do build, em `extension/dist`:

```bash
cd extension
npm install
npm run build      # gera extension/dist (use npm run watch durante o desenvolvimento)
npm test           # testes da resolucao de titulo
npm run lint && npm run typecheck
```

**Chrome / Edge**

1. Abra `chrome://extensions` ou `edge://extensions`.
2. Ative **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactacao** e escolha a pasta `extension/dist` deste repositorio.
4. Abra o SiteNotes em `http://localhost:4200` **no mesmo navegador**.

**Firefox**

1. Na barra de endereco, abra `about:debugging#/runtime/this-firefox`.
2. Clique em **Carregar extensao temporaria...** (Load Temporary Add-on).
3. Selecione o arquivo `extension/dist/manifest.json` deste repositorio.
4. Se a extensao ja estava carregada, clique em **Recarregar**.
5. Recarregue o SiteNotes em `http://localhost:4200` **no mesmo Firefox**.

No Firefox estavel a extensao temporaria some quando o navegador fecha. Na proxima sessao, repetir os passos 1-4. Para manter instalada, use o Firefox Developer Edition ou o Nightly.

Ao abrir o app, o SiteNotes pergunta qual aba voce deseja anotar. O titulo da referencia e resolvido no cliente (extensao) e enviado pronto para o backend salvar. Voce tambem pode clicar em **A partir de uma aba** a qualquer momento.

## Uso

1. Rode o backend e o frontend (ver acima) e instale a extensao (recomendada para titulo automatico).
2. Abra `http://localhost:4200` e, se a extensao estiver ativa, escolha a aba que deseja anotar.
3. Sem a extensao, clique em **"+ Novo site"** e cole a URL: informe o titulo manualmente ou deixe o host/URL como fallback.
4. Clique na referencia cadastrada para abrir a tela de detalhe, onde voce pode:
   - Abrir o site em uma nova aba a qualquer momento.
   - Adicionar quantos rascunhos/anotacoes quiser, cada um com data/hora.
   - Editar ou excluir anotacoes antigas.
5. Use a busca e o filtro por tag na tela inicial para encontrar referencias antigas rapidamente.

## Endpoints da API

| Metodo | Rota | Descricao |
| --- | --- | --- |
| GET | `/api/references?search=&tag=` | Lista referencias, com busca por titulo/url e filtro por tag |
| GET | `/api/references/{id}` | Detalhe de uma referencia |
| POST | `/api/references` | Cria uma referencia (`url`, `title`, `tags`) |
| PUT | `/api/references/{id}` | Atualiza uma referencia |
| DELETE | `/api/references/{id}` | Remove uma referencia (e suas anotacoes) |
| GET | `/api/references/{id}/notes` | Lista as anotacoes de uma referencia |
| POST | `/api/references/{id}/notes` | Adiciona uma anotacao a uma referencia |
| PUT | `/api/notes/{id}` | Atualiza uma anotacao |
| DELETE | `/api/notes/{id}` | Remove uma anotacao |
