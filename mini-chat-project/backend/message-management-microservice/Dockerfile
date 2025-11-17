# Multi-stage build for Node.js microservice
# Stage 1: Build stage
FROM node:18-alpine AS builder

# Install dependencies for native modules (bcrypt, etc.)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for potential build steps)
RUN npm ci --only=production

# Stage 2: Production stage
FROM node:18-alpine

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application source
COPY --chown=nodejs:nodejs src ./src

# Create directory for JWT keys
RUN mkdir -p /app/keys && chown nodejs:nodejs /app/keys

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3002/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "src/server.js"]
