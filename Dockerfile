# Use Node.js 18 as base image
FROM node:18-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create directory for generated art
RUN mkdir -p generated-art

# Build TypeScript
RUN npm run build

# Start the agent
CMD ["npm", "start"] 