# Build stage
FROM node:24-alpine AS builder

ARG COMMIT_HASH
RUN test -n "$COMMIT_HASH" || (echo "ERROR: COMMIT_HASH build arg is required" && exit 1)

WORKDIR /app

# Copy root workspace files for pnpm install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY server/package.json ./server/
COPY shared/package.json ./shared/

# Install all dependencies (including dev dependencies for build)
RUN corepack enable && pnpm install --frozen-lockfile --filter @richpods/server...

# Copy shared workspace (server builds it via build:shared)
COPY shared ./shared

# Copy source files
COPY server/tsconfig.json ./server/
COPY server/codegen.yml ./server/
COPY server/schema.graphql ./server/
COPY server/src ./server/src

# Build the application
WORKDIR /app/server
RUN pnpm run build
RUN printf '{"commitHash":"%s"}\n' "$COMMIT_HASH" > build/build-info.json

# Production stage
FROM node:24-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy root workspace files for pnpm install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY server/package.json ./server/
COPY shared/package.json ./shared/

# Install only production dependencies for the server workspace and its local workspace deps.
RUN corepack enable && pnpm install --prod --frozen-lockfile --filter @richpods/server...

# Copy built shared workspace
COPY --from=builder --chown=nodejs:nodejs /app/shared/dist ./shared/dist

# Copy built server application
COPY --from=builder --chown=nodejs:nodejs /app/server/build ./server/build
COPY --from=builder --chown=nodejs:nodejs /app/server/schema.graphql ./server/

# Switch to non-root user
USER nodejs

EXPOSE 4000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server/build/src/server.js"]
