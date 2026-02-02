# BüroBuddy Web — Next.js (monorepo workspace)
# Build context must be repo root so workspaces resolve.
FROM node:20-alpine

WORKDIR /app

# Root package files and workspaces
COPY package.json package-lock.json* ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# Install all dependencies (root workspace)
RUN npm ci

# Build shared package so web can use it
RUN npm run build --workspace=packages/shared 2>/dev/null || true

WORKDIR /app/apps/web

# Browser will call API at host:8000
ENV NEXT_PUBLIC_API_URL=http://localhost:8000

EXPOSE 3000
# Bind to 0.0.0.0 so container is reachable from host
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]
