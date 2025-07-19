# ANF-AIOps MCP Server Dockerfile
# Author: Dwiref Sharma <DwirefS@SapientEdge.io>
# Multi-stage build for production-ready container

# =============================================================================
# BUILD STAGE
# =============================================================================
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci --include=dev

# Copy source code
COPY src/ ./src/
COPY tests/ ./tests/

# Build the application
RUN npm run build

# Run tests to ensure quality
RUN npm run test

# Remove dev dependencies and install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# =============================================================================
# PRODUCTION STAGE
# =============================================================================
FROM node:18-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mcp -u 1001

# Set working directory
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    ca-certificates \
    && update-ca-certificates

# Copy built application from builder stage
COPY --from=builder --chown=mcp:nodejs /app/dist ./dist
COPY --from=builder --chown=mcp:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=mcp:nodejs /app/package*.json ./

# Copy configuration files
COPY --chown=mcp:nodejs docker/mcp-server/config/ ./config/

# Create necessary directories
RUN mkdir -p /app/logs /app/data && \
    chown -R mcp:nodejs /app/logs /app/data

# Switch to non-root user
USER mcp

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]

# =============================================================================
# LABELS
# =============================================================================
LABEL maintainer="Dwiref Sharma <DwirefS@SapientEdge.io>"
LABEL version="2.0.0"
LABEL description="ANF-AIOps Model Context Protocol Server"
LABEL org.opencontainers.image.title="ANF-AIOps MCP Server"
LABEL org.opencontainers.image.description="Model Context Protocol server for Azure NetApp Files AI operations"
LABEL org.opencontainers.image.version="2.0.0"
LABEL org.opencontainers.image.authors="Dwiref Sharma <DwirefS@SapientEdge.io>"
LABEL org.opencontainers.image.url="https://github.com/your-org/ANF-AIOps"
LABEL org.opencontainers.image.documentation="https://github.com/your-org/ANF-AIOps/blob/main/docs/README.md"
LABEL org.opencontainers.image.source="https://github.com/your-org/ANF-AIOps"
LABEL org.opencontainers.image.licenses="MIT"