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

FROM nginx:1.27-alpine-slim AS final

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/site-notes-app/browser /usr/share/nginx/html

EXPOSE 80

STOPSIGNAL SIGQUIT

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
