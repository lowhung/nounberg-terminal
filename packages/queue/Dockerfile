FROM node:18-alpine

RUN apk add --no-cache curl

WORKDIR /app

# Copy package.json and package-lock.json first for better caching
COPY package*.json ./

# Install all dependencies (including dev deps for building)
RUN npm ci

# Copy source code
COPY . .

# Build the workers (TypeScript compilation)
RUN npm run build

# Start the workers
CMD ["npm", "run", "start"]
