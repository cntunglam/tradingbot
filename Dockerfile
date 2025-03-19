# Use Node.js LTS (Long Term Support) as base image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Expose port (matches the port in src/index.ts)
EXPOSE 3001

# Set environment variables with default values
# These can be overridden when running the container
ENV PORT=3001
ENV NODE_ENV=production

# Start the server
CMD ["node", "dist/index.js"]
