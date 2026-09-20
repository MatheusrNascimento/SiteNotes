# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app

ENV NG_CLI_ANALYTICS=false

COPY package.json package-lock.json ./
RUN --mount=type=cache,id=sitenotes-npm,target=/root/.npm \
    npm ci --no-audit --no-fund

COPY . ./

ENV NODE_ENV=production
RUN npm run build

FROM node:22-alpine AS final
WORKDIR /app

ENV NODE_ENV=production

RUN --mount=type=cache,id=sitenotes-npm,target=/root/.npm \
    npm install -g serve@14.2.4

COPY --from=build /app/dist/site-notes-app/browser ./dist

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
    CMD node -e "fetch('http://127.0.0.1:80/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["serve", "-s", "dist", "-l", "80"]
