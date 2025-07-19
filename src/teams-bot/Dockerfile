# ANF-AIOps Teams Bot Dockerfile
# Author: Dwiref Sharma <DwirefS@SapientEdge.io>
# Multi-stage build for Teams Bot application

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

# Install dependencies
RUN npm ci --include=dev

# Copy source code
COPY src/ ./src/
COPY tests/ ./tests/
COPY assets/ ./assets/

# Build the application
RUN npm run build

# Run tests
RUN npm run test

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# =============================================================================
# PRODUCTION STAGE
# =============================================================================
FROM node:18-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S teamsbot -u 1001

# Set working directory
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    ca-certificates \
    && update-ca-certificates

# Copy built application
COPY --from=builder --chown=teamsbot:nodejs /app/dist ./dist
COPY --from=builder --chown=teamsbot:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=teamsbot:nodejs /app/package*.json ./
COPY --from=builder --chown=teamsbot:nodejs /app/assets ./assets

# Copy configuration files
COPY --chown=teamsbot:nodejs docker/teams-bot/config/ ./config/

# Create necessary directories
RUN mkdir -p /app/logs /app/cache && \
    chown -R teamsbot:nodejs /app/logs /app/cache

# Switch to non-root user
USER teamsbot

# Expose port
EXPOSE 3978

# Health check for Teams Bot
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3978/api/health || exit 1

# Use dumb-init for signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]

# =============================================================================
# LABELS
# =============================================================================
LABEL maintainer="Dwiref Sharma <DwirefS@SapientEdge.io>"
LABEL version="2.0.0"
LABEL description="ANF-AIOps Microsoft Teams Bot"
LABEL org.opencontainers.image.title="ANF-AIOps Teams Bot"
LABEL org.opencontainers.image.description="Microsoft Teams bot for Azure NetApp Files AI operations"
LABEL org.opencontainers.image.version="2.0.0"
LABEL org.opencontainers.image.authors="Dwiref Sharma <DwirefS@SapientEdge.io>"
LABEL org.opencontainers.image.url="https://github.com/your-org/ANF-AIOps"
LABEL org.opencontainers.image.documentation="https://github.com/your-org/ANF-AIOps/blob/main/docs/README.md"
LABEL org.opencontainers.image.source="https://github.com/your-org/ANF-AIOps"
LABEL org.opencontainers.image.licenses="MIT"