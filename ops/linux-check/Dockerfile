# syntax=docker/dockerfile:1
# Verification image only. Do not select this Dockerfile for a Coolify application.
FROM node:24.22.2-bookworm-slim AS dependencies
WORKDIR /app

ENV CI=1 NEXT_TELEMETRY_DISABLED=1 CHECKPOINT_DISABLE=1

# Prisma 5 needs OpenSSL detection and HTTPS certificates in this Linux image.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

# Only package installation may use the network. No application secrets are copied.
COPY package.json package-lock.json ./
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN npm ci --include=dev --include=optional --no-audit --no-fund

FROM dependencies AS linux-check
COPY . .

# This stage cannot reach PostgreSQL, Bunny or any other external service.
# typegen creates next-env.d.ts and route types on this fresh Linux filesystem.
RUN --network=none node -e "const fs = require('node:fs'); if (Object.hasOwn(process.env, 'DATABASE_URL') || fs.readdirSync('.').some(name => name.startsWith('.env'))) throw new Error('Verification must not contain database configuration or env files');" \
    && npm run verify:runtime \
    && node node_modules/next/dist/bin/next typegen \
    && npm test \
    && npm run typecheck \
    && npm run build

# Run with --network none. The HTTP checks use container loopback only.
CMD ["npm", "run", "test:production"]
