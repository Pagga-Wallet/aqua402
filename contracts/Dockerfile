FROM node:20-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with legacy peer deps to resolve conflicts
RUN npm install --legacy-peer-deps

# Copy rest of the project
COPY . .

# Expose Hardhat node port
EXPOSE 8545

# Start Hardhat node
CMD ["npx", "hardhat", "node", "--hostname", "0.0.0.0"]

