# Static SPA build (ssr: false) served by Nginx. Built by GitHub Actions.
# NUXT_PUBLIC_API_BASE is baked into the bundle at build time.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
ARG NUXT_PUBLIC_API_BASE=http://localhost:8000
ENV NUXT_PUBLIC_API_BASE=$NUXT_PUBLIC_API_BASE \
    NUXT_TELEMETRY_DISABLED=1
RUN npx nuxt prepare && npx nuxt generate

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/.output/public /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
