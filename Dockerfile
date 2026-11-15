# syntax=docker/dockerfile:1

FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps --no-audit --no-fund

# Copy source and build the frontend
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Requires Node 22.6+ for native TypeScript type-stripping (server.ts imports .ts modules)
CMD ["node", "server.ts"]
