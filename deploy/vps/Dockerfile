# ─────────────────────────────────────────────────────────────
# RAJ TRADERS — VPS Production Dockerfile (Debian/Alpine Node 20)
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Install native dependencies needed for PostgreSQL client bindings
RUN apk add --no-cache libc6-compat curl

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Create uploads directory for persistent product photo storage
RUN mkdir -p /app/uploads/products && chown -R node:node /app

# Copy production package.json and dependencies from deploy/api
COPY deploy/api/package.json ./package.json
COPY deploy/api/package-lock.json* ./
RUN npm install --omit=dev --ignore-scripts

# Copy compiled backend bundle
COPY artifacts/api-server/dist ./dist

# Use non-root node user for container security
USER node

EXPOSE 8080

# Healthcheck to ensure container auto-heals
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1

CMD ["node", "--enable-source-maps", "dist/index.mjs"]
