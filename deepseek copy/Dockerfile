# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Add build dependencies
RUN apk add --no-cache python3 make g++ git

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Generate Prisma Client


# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Run
FROM node:18-alpine

WORKDIR /app

# Copy built assets
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json


EXPOSE 3000

CMD ["npm", "start"] 