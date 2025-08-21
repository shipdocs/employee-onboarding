# Maritime Onboarding System - Production Dockerfile
# Multi-stage build for optimized production image

# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Build client if it exists (with legacy peer deps for compatibility)
RUN if [ -d "client" ]; then \
    cd client && \
    npm ci --legacy-peer-deps && \
    npm run build && \
    cd ..; \
fi

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S maritime -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for production build)
RUN npm ci && npm cache clean --force

# Copy application code from builder
COPY --from=builder --chown=maritime:nodejs /app .

# Create necessary directories
RUN mkdir -p uploads logs certificates && \
    chown -R maritime:nodejs uploads logs certificates

# Set proper permissions
RUN chmod +x server.js || true

# Expose port
EXPOSE 3000

# Switch to non-root user
USER maritime

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
