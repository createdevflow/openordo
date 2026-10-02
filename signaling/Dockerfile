FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build the TypeScript code
RUN npm run build

# Start the server
CMD ["npm", "start"]
