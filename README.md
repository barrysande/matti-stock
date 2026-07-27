# Matti Stock

Matti Stock is a stock-management system built as a pnpm monorepo.

## Repository guide

- Product requirements, accepted design decisions, and delivery planning:
  [`planning/`](./planning/)
- API implementation documentation: [`apps/api/docs/`](./apps/api/docs/)
- Web implementation documentation: [`apps/web/docs/`](./apps/web/docs/)

The AdonisJS API lives in `apps/api`. The SvelteKit application lives in
`apps/web`. Development infrastructure and root commands will be documented
here as they are established.

## Development

Development infrastructure runs in Docker Compose. Applications and the queue
worker run on the host through pnpm.

```sh
docker compose up -d
```

Run each process in its own terminal:

```sh
pnpm dev:api
pnpm dev:queue
pnpm dev:web
```

The baseline migration set currently creates queue infrastructure only.
Authentication and account migrations will be introduced under their own
approved feature plan. The queue worker requires the baseline migration to have
run successfully.

Local services:

```txt
- PostgreSQL: `127.0.0.1:5434`
- pgAdmin: `http://127.0.0.1:5051`
- Redis: `127.0.0.1:6380`
```

Inside pgAdmin, connect to PostgreSQL using host `postgres`, port `5432`,
database `matti_stock`, user `matti_stock_user`, and the local development
password from `docker-compose.yml`.
