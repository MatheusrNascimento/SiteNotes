# SiteNotes

Bloco de notas para guardar referencias de sites/paginas que voce leu ou assistiu e quer manter como referencia, com um "diario" de rascunhos/anotacoes datadas vinculado a cada site.

A ideia de uso: abra o site em uma janela e o SiteNotes em outra, lado a lado, e vá registrando anotacoes conforme le/assiste o conteudo.

## Estrutura do projeto

```
SiteNotes/
  backend/
    SiteNotes.Domain/          Dominio rico: agregados, value objects e servicos de dominio
    SiteNotes.Application/     Casos de uso em servicos de aplicacao
    SiteNotes.Infrastructure/  MongoDB (EF Core) e leitura HTTP de paginas
    SiteNotes.Api/             API REST em ASP.NET Core (.NET 10)
    SiteNotes.Tests/           Testes de unidade com xUnit
  frontend/
    site-notes-app/            SPA em Angular
  extension/                   Extensao Chrome/Edge/Firefox para ler as abas abertas
```

O desenho do backend, as entidades e o jeito de acrescentar regra de negocio estao em [backend/docs/arquitetura-e-dominio.md](backend/docs/arquitetura-e-dominio.md).

## Testes do backend

```powershell
dotnet test backend/SiteNotes.slnx
```

## Pre-requisitos

- [.NET SDK 10](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/) (inclui npm)
- MongoDB rodando localmente na porta padrao (`27017`)
  - Instalacao local: https://www.mongodb.com/try/download/community
  - Ou via Docker: `docker run -d --name sitenotes-mongo -p 27017:27017 mongo:8.3.11`

Nao e necessario criar o banco ou as collections manualmente: o MongoDB e schemaless e o EF Core cria as collections `references` e `notes` automaticamente no primeiro registro salvo.

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
| MongoDB   | localhost:27017          |

Para parar: `docker compose down`. Para apagar tambem o volume do banco: `docker compose down -v`.

Credenciais do Mongo ficam no `.env` (nao versionado). Se voce mudar usuario/senha depois do primeiro start, remova o volume (`-v`) para o Mongo reinicializar.

## Rodando o backend (API)

```powershell
cd backend/SiteNotes.Api
dotnet run
```

A API sobe por padrao em `http://localhost:5210` (definido em `Properties/launchSettings.json`).

A connection string do MongoDB e o nome do banco ficam em `appsettings.json`:

```json
{
  "ConnectionStrings": {
    "MongoDb": "mongodb://localhost:27017"
  },
  "MongoDbSettings": {
    "DatabaseName": "SiteNotesDb"
  }
}
```

Ajuste esses valores se o seu MongoDB estiver em outro host/porta, ou se quiser usar o MongoDB Atlas (cluster na nuvem).

## Rodando o frontend (Angular)

```powershell
cd frontend/site-notes-app
npm install
npm start
```

O Angular sobe em `http://localhost:4200` e ja esta configurado (CORS no backend, URL da API no frontend) para conversar com a API em `http://localhost:5210/api`.

Se voce mudar a porta da API, atualize também:
- `backend/SiteNotes.Api/appsettings.json` -> `Cors:AllowedOrigins`
- `frontend/site-notes-app/src/app/core/config/api.config.ts` -> `API_BASE_URL`

## Extensao do navegador (abas abertas)

Uma pagina web nao consegue listar as outras abas por seguranca. A extensao em `extension/` faz essa ponte com o Chrome, o Edge ou o Firefox.

**Chrome / Edge**

1. Abra `chrome://extensions` ou `edge://extensions`.
2. Ative **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactacao** e escolha a pasta `extension` deste repositorio.
4. Abra o SiteNotes em `http://localhost:4200` **no mesmo navegador**.

**Firefox**

1. Na barra de endereco, abra `about:debugging#/runtime/this-firefox`.
2. Clique em **Carregar extensao temporaria...** (Load Temporary Add-on).
3. Selecione o arquivo `extension/manifest.json` deste repositorio.
4. Se a extensao ja estava carregada, clique em **Recarregar**.
5. Recarregue o SiteNotes em `http://localhost:4200` **no mesmo Firefox**.

No Firefox estavel a extensao temporaria some quando o navegador fecha. Na proxima sessao, repetir os passos 1-4. Para manter instalada, use o Firefox Developer Edition ou o Nightly.

Ao abrir o app, o SiteNotes pergunta qual aba voce deseja anotar. O titulo da referencia e preenchido com o titulo da pagina (ou o titulo do video no YouTube). Voce tambem pode clicar em **A partir de uma aba** a qualquer momento.

## Uso

1. Rode o backend e o frontend (ver acima) e instale a extensao (opcional, mas recomendada).
2. Abra `http://localhost:4200` e, se a extensao estiver ativa, escolha a aba que deseja anotar.
3. Sem a extensao, clique em **"+ Novo site"** e cole a URL: o titulo e buscado automaticamente na pagina/video.
4. Clique na referencia cadastrada para abrir a tela de detalhe, onde voce pode:
   - Abrir o site em uma nova aba a qualquer momento.
   - Adicionar quantos rascunhos/anotacoes quiser, cada um com data/hora.
   - Editar ou excluir anotacoes antigas.
5. Use a busca e o filtro por tag na tela inicial para encontrar referencias antigas rapidamente.

## Endpoints da API

| Metodo | Rota | Descricao |
| --- | --- | --- |
| GET | `/api/page-metadata?url=` | Busca o titulo da pagina ou do video do YouTube |
| GET | `/api/references?search=&tag=` | Lista referencias, com busca por titulo/url e filtro por tag |
| GET | `/api/references/{id}` | Detalhe de uma referencia |
| POST | `/api/references` | Cria uma referencia |
| PUT | `/api/references/{id}` | Atualiza uma referencia |
| DELETE | `/api/references/{id}` | Remove uma referencia (e suas anotacoes) |
| GET | `/api/references/{id}/notes` | Lista as anotacoes de uma referencia |
| POST | `/api/references/{id}/notes` | Adiciona uma anotacao a uma referencia |
| PUT | `/api/notes/{id}` | Atualiza uma anotacao |
| DELETE | `/api/notes/{id}` | Remove uma anotacao |
