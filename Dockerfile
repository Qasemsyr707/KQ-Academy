
FROM node:24.22.2-bookworm-slim

WORKDIR /app

# Install system dependencies required by Prisma
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

ENV NEXT_TELEMETRY_DISABLED=1

# Install project dependencies
COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci --include=dev --include=optional --no-audit --no-fund

# Copy application source
COPY . .

# Build Next.js application
RUN npm run build

# Production runtime
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "run", "start"]
