# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . ./

ARG API_BASE_URL=http://localhost:5210/api
RUN sed -i "s#apiBaseUrl: '.*'#apiBaseUrl: '${API_BASE_URL}'#" src/environments/environment.ts \
    && grep -q "apiBaseUrl: '${API_BASE_URL}'" src/environments/environment.ts
RUN npm run build

FROM nginx:1.27-alpine AS final

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/site-notes-app/browser /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
