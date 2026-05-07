# syntax=docker/dockerfile:1
# Build context: monorepo root
# Usage: docker build -f apps/web/Dockerfile -t cashmgr-web .

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy workspace manifests first for better layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json ./
COPY packages/core/package.json ./packages/core/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY apps/mobile/package.json ./apps/mobile/package.json
COPY apps/desktop/package.json ./apps/desktop/package.json

RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/core ./packages/core
COPY packages/db ./packages/db
COPY packages/ui ./packages/ui
COPY apps/web ./apps/web

# Build mode: production (default) or development
# Override with: docker build --build-arg MODE=development ...
ARG MODE=production

# Build shared packages in dependency order, then web app
RUN pnpm --filter @cashmgr/core build && \
    pnpm --filter @cashmgr/db build && \
    pnpm --filter @cashmgr/ui build && \
    pnpm --filter @cashmgr/web exec vite build --mode ${MODE}

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:alpine

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
