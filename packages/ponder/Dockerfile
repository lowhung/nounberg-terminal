FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose Ponder's default port
EXPOSE 42069

# Start Ponder
CMD ["npm", "run", "start"]
