# ── Stage 1: Build ────────────────────────────────────────────────────
FROM node:20-slim AS build

WORKDIR /app

# Install build tools for better-sqlite3 (native addon)
RUN apt-get update && \
    apt-get install -y python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

# Install ALL dependencies (including devDependencies for vite build)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and build the client
COPY . .
RUN npm run build

# ── Stage 2: Production ──────────────────────────────────────────────
FROM node:20-slim

WORKDIR /app

# Install build tools (needed for better-sqlite3 native rebuild)
RUN apt-get update && \
    apt-get install -y python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

# Copy package files and install production deps only
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy server source
COPY server/ ./server/

# Copy built client from stage 1
COPY --from=build /app/dist ./dist

# Fly.io sets PORT; default to 3001
ENV PORT=3001
ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "server/index.js"]
