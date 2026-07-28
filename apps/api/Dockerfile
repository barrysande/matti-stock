# Build from the monorepo root:
#   docker build -f apps/api/Dockerfile -t matti-stock-api .
#
# The same image runs both long-lived API processes:
#   HTTP server:  node bin/server.js
#   Queue worker: node bin/console.js queue:work --queue=emails,reports

FROM node:24-bookworm-slim AS base

RUN corepack enable && corepack install --global pnpm@11.5.2

# Install the API workspace dependency graph in a source-independent layer.
FROM base AS dependencies
WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/

RUN pnpm install --frozen-lockfile --filter api

# Compile AdonisJS's standalone production build.
FROM dependencies AS build
WORKDIR /repo

COPY apps/api apps/api

WORKDIR /repo/apps/api
RUN node ace build --package-manager=pnpm

# Install only the standalone build's production dependencies.
FROM base AS production
WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /repo/apps/api/build ./

RUN pnpm install --prod

EXPOSE 3333

CMD ["node", "bin/server.js"]
