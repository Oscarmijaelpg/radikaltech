# syntax=docker/dockerfile:1.7
# =============================================================================
# Dockerfile para apps/api (monorepo pnpm)
#
# El backend corre con `tsx` en runtime porque `packages/db` y `packages/shared`
# exportan archivos .ts directamente (patrón de monorepo TypeScript). Bundlear
# todo con tsup/esbuild es una optimización futura; por ahora tsx en runtime
# persistente cuesta ~30-50ms extra al arranque y mantiene el setup simple.
#
# IMPORTANTE: usa `node:20-slim` (Debian, glibc) — NO alpine — para evitar
# problemas con los binarios pre-compilados de Prisma.
# =============================================================================

# ----------------------------------------------------------------------------
# Stage 1: Builder — instala deps + genera Prisma client
# ----------------------------------------------------------------------------
FROM node:20-slim AS builder

# OpenSSL requerido por Prisma en runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

# Copia los manifests PRIMERO para aprovechar cache layer de Docker
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/

# Install con filter: solo lo que necesita el API (excluye UI/web)
# `--filter @radikal/api...` incluye las dependencies del workspace (db, shared)
RUN pnpm install --frozen-lockfile \
    --filter @radikal/api... \
    --filter @radikal/db \
    --filter @radikal/shared

# Copia el source después de instalar deps (mejor cache invalidation)
COPY apps/api ./apps/api
COPY packages/db ./packages/db
COPY packages/shared ./packages/shared

# Genera el cliente Prisma
RUN cd packages/db && pnpm exec prisma generate

# ----------------------------------------------------------------------------
# Stage 2: Runner — imagen mínima para correr el API
# ----------------------------------------------------------------------------
FROM node:20-slim AS runner

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates tini \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

# Copia todo el resultado del builder
COPY --from=builder /app /app

ENV NODE_ENV=production
# Puerto por defecto — EasyPanel lo sobrescribe con PORT env
ENV PORT=3001
EXPOSE 3001

# Healthcheck — EasyPanel lo usa para marcar "ready"
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://localhost:'+process.env.PORT+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

WORKDIR /app/apps/api

# tini como PID 1 para forwarding correcto de señales (SIGTERM en shutdown)
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["pnpm", "exec", "tsx", "src/server.ts"]
