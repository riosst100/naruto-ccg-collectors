# syntax=docker/dockerfile:1
# One image holds the whole workspace; docker-compose picks which app to run (web / admin / migrate).

FROM node:22-bookworm-slim AS build
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && npm install -g pnpm@12.3.4
WORKDIR /app
COPY . .
# Installs with the committed lockfile; the postinstall hook generates the Prisma client for linux.
RUN pnpm install --frozen-lockfile
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:22-bookworm-slim AS runtime
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && npm install -g pnpm@12.3.4
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
# Dev dependencies stay on purpose: `prisma migrate deploy` and the seed script (tsx) run from this image.
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 3000 3001
