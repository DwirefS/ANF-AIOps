# ANF-AIOps RAG System Dockerfile
# Author: Dwiref Sharma <DwirefS@SapientEdge.io>
# RAG (Retrieval-Augmented Generation) system container

# =============================================================================
# BUILD STAGE
# =============================================================================
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies including Python for some native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    py3-pip

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --include=dev

# Copy source code
COPY src/ ./src/
COPY data/ ./data/
COPY scripts/ ./scripts/
COPY tests/ ./tests/

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
    adduser -S rag -u 1001

# Set working directory
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    ca-certificates \
    python3 \
    py3-pip \
    && update-ca-certificates

# Install Python packages for document processing
RUN pip3 install --no-cache-dir \
    PyPDF2 \
    python-docx \
    beautifulsoup4 \
    lxml

# Copy built application
COPY --from=builder --chown=rag:nodejs /app/dist ./dist
COPY --from=builder --chown=rag:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=rag:nodejs /app/package*.json ./
COPY --from=builder --chown=rag:nodejs /app/data ./data
COPY --from=builder --chown=rag:nodejs /app/scripts ./scripts

# Copy configuration files
COPY --chown=rag:nodejs docker/rag/config/ ./config/

# Create necessary directories
RUN mkdir -p /app/logs /app/cache /app/documents /app/embeddings && \
    chown -R rag:nodejs /app/logs /app/cache /app/documents /app/embeddings

# Switch to non-root user
USER rag

# Expose port for RAG API
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Use dumb-init for signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the RAG service
CMD ["node", "dist/index.js"]

# =============================================================================
# LABELS
# =============================================================================
LABEL maintainer="Dwiref Sharma <DwirefS@SapientEdge.io>"
LABEL version="2.0.0"
LABEL description="ANF-AIOps RAG System"
LABEL org.opencontainers.image.title="ANF-AIOps RAG System"
LABEL org.opencontainers.image.description="Retrieval-Augmented Generation system for Azure NetApp Files documentation"
LABEL org.opencontainers.image.version="2.0.0"
LABEL org.opencontainers.image.authors="Dwiref Sharma <DwirefS@SapientEdge.io>"
LABEL org.opencontainers.image.url="https://github.com/your-org/ANF-AIOps"
LABEL org.opencontainers.image.documentation="https://github.com/your-org/ANF-AIOps/blob/main/docs/README.md"
LABEL org.opencontainers.image.source="https://github.com/your-org/ANF-AIOps"
LABEL org.opencontainers.image.licenses="MIT"