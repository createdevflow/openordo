FROM node:20-alpine

WORKDIR /app

# We put package.json in /app so node_modules is in /app/node_modules
# This allows both /app/signaling/src and /app/shared to resolve dependencies
COPY signaling/package.json signaling/package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source files
COPY signaling ./signaling
COPY shared ./shared

# Change workdir to signaling to run the build and start commands
WORKDIR /app/signaling

# Build the TypeScript code
RUN npm run build

# Start the server
CMD ["npm", "start"]
