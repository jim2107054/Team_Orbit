# ─── Stage 1: Build ──────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm ci --production=false

# Copy source and build
COPY . .
RUN npm run build

# ─── Stage 2: Production ─────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Security: Run as non-root user
RUN addgroup -g 1001 -S shieldgroup && \
    adduser -S shielduser -u 1001 -G shieldgroup

# Install production dependencies only
COPY package.json package-lock.json* ./
RUN npm ci --production && npm cache clean --force

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Set ownership
RUN chown -R shielduser:shieldgroup /app

USER shielduser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

EXPOSE 4000

ENV NODE_ENV=production

CMD ["node", "dist/server.js"]
