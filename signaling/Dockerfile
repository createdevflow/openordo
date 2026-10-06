FROM node:20-alpine

WORKDIR /app

# Copy package files to the root /app directory
COPY signaling/package.json signaling/package-lock.json* ./

# Install dependencies at the root level so both signaling and shared can find them
RUN npm ci

# Copy the shared directory
COPY shared ./shared

# Copy the signaling source
COPY signaling ./signaling

# Build the TypeScript code
RUN cd signaling && npm run build

# Start the server
WORKDIR /app/signaling
CMD ["npm", "start"]
