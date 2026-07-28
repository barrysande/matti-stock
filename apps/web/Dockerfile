# Build from the monorepo root:
#   docker build -f apps/web/Dockerfile -t matti-stock-web .
#
# The build needs the API workspace because the server bundle consumes the
# generated Tuyau registry from `api/registry`.

FROM node:24-bookworm-slim AS base

RUN corepack enable && corepack install --global pnpm@11.5.2

# Install the web workspace and its local API dependency.
FROM base AS dependencies
WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

RUN pnpm install --frozen-lockfile --filter web...

# Build the adapter-node server and create its production dependency bundle.
FROM dependencies AS build
WORKDIR /repo

COPY apps/api apps/api
COPY apps/web apps/web

RUN pnpm --filter web build
RUN pnpm --filter web deploy --prod --legacy /out

# Run only the adapter-node output and production dependencies.
FROM base AS production
WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /out/package.json ./
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /repo/apps/web/build ./build

EXPOSE 3000

CMD ["node", "build"]
