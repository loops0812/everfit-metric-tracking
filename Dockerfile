FROM node:24.14.0-alpine3.23 AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm fetch

FROM base AS build 
RUN pnpm install --offline --frozen-lockfile
COPY . .
RUN pnpm run build

FROM base AS run-deps
RUN pnpm install --offline --prod --frozen-lockfile
    
FROM node:24.14.0-alpine3.23 AS run
WORKDIR /app
COPY package.json .
COPY --from=run-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
CMD ["node", "dist/main.js"]