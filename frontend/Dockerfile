# ─── Stage 1: Build ──────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ─── Stage 2: Production (standalone output) ─────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Security: Run as non-root user
RUN addgroup -g 1001 -S nextgroup && \
    adduser -S nextuser -u 1001 -G nextgroup

# Copy standalone build output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Set ownership
RUN chown -R nextuser:nextgroup /app

USER nextuser

EXPOSE 3000

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

CMD ["node", "server.js"]
