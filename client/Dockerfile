# Maritime Onboarding System - Frontend Dockerfile
# Multi-stage build: Build React app + Serve with Nginx

# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps && npm cache clean --force

# Copy source code
COPY . .

# Build the React application
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built React app from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Set permissions (nginx user already exists in base image)
RUN chown -R nginx:nginx /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
