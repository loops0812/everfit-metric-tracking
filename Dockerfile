# Build stage
FROM node:24.14.0-alpine3.23 AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack install && pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# Production stage
FROM node:24.14.0-alpine3.23
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack install && pnpm install --frozen-lockfile --prod
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]
