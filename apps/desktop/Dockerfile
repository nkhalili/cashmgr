# syntax=docker/dockerfile:1
# Build context: monorepo root
# Usage:
#   Linux only (default):
#     docker build -f apps/desktop/Dockerfile -t cashmgr-desktop-builder .
#
#   Linux + Windows (requires Wine, installed below):
#     docker build -f apps/desktop/Dockerfile \
#       --build-arg PLATFORMS="--linux --win" \
#       -t cashmgr-desktop-builder .
#
#   macOS (.dmg) cannot be built on Linux — run electron-builder natively on macOS:
#     pnpm build:packages && pnpm --filter @cashmgr/desktop build:electron
#     cd apps/desktop && pnpm exec electron-builder --mac --publish=never
#
# Artifacts are written to apps/desktop/release/ inside the container.
# Copy them out with:
#   docker create --name extract cashmgr-desktop-builder
#   docker cp extract:/app/apps/desktop/release ./release
#   docker rm extract

FROM node:22-bookworm AS builder

# Build tools required by better-sqlite3 (native module)
RUN dpkg --add-architecture i386 && \
    apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    # Wine for cross-compiling Windows NSIS installer on Linux (wine32 needed for rcedit)
    wine wine64 wine32:i386 \
    && rm -rf /var/lib/apt/lists/*

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
COPY apps/desktop ./apps/desktop

# Build shared packages in dependency order
RUN pnpm --filter @cashmgr/core build && \
    pnpm --filter @cashmgr/db build && \
    pnpm --filter @cashmgr/ui build

# Build web app (desktop embeds it) and compile Electron TypeScript
RUN pnpm --filter @cashmgr/web build && \
    pnpm --filter @cashmgr/desktop build:electron

# Package distributables
# electron-builder rebuilds better-sqlite3 for Electron automatically.
# Defaults to --linux (AppImage). Pass --build-arg PLATFORMS="--linux --win" for both.
ARG PLATFORMS=--linux
WORKDIR /app/apps/desktop
RUN pnpm exec electron-builder ${PLATFORMS} --publish=never
