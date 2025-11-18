FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY src/package.json ./
COPY src/package-lock.json* ./

# Install dependencies
RUN npm install

# Copy application source
COPY src ./

# Start the application
CMD ["node", "server.js"]
