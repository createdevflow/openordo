FROM node:20-alpine

WORKDIR /app

# Copy package files (we are running from root context)
COPY signaling/package.json signaling/package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source files
COPY signaling/src ./src
COPY signaling/tsconfig.json ./tsconfig.json
COPY shared ../shared

# Build the TypeScript code
RUN npm run build

# Start the server
CMD ["npm", "start"]
