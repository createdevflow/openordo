FROM node:20-alpine

WORKDIR /app

# Copy package files for signaling
COPY signaling/package.json signaling/package-lock.json* ./signaling/

# Install dependencies for signaling
RUN cd signaling && npm ci

# Copy the shared directory
COPY shared ./shared

# Copy the signaling source
COPY signaling ./signaling

# Build the TypeScript code
RUN cd signaling && npm run build

# Start the server
WORKDIR /app/signaling
CMD ["npm", "start"]
