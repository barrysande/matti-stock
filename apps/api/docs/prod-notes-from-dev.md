# API Production Notes from Development

Record development findings here when they affect deployment, infrastructure,
environment configuration, migrations, workers, backups, or production
operations.

## Local PostgreSQL boundary

The host-run API connects to local PostgreSQL at `127.0.0.1:5434`. PostgreSQL
will continue to listen on its normal container port `5432`; Docker Compose
maps the approved host port to that container port.

The same PostgreSQL container initializes a separate `matti_stock_test`
database. Functional tests must use it rather than migrate, truncate, or mutate
development data.

## Local Redis boundary

Redis is available at `127.0.0.1:6380` for Transmit's cross-process bus. It is
not a queue backend, atomic-lock store, or source of durable notification
state. Development and production use the Redis transport; test runs keep
Transmit process-local unless a later transport-specific test explicitly
requires Redis.

Transmit routes remain unregistered until session authentication and channel
authorization are implemented. Production must give the HTTP server and queue
worker the same `REDIS_HOST`, `REDIS_PORT`, and optional `REDIS_PASSWORD`.
Traefik must not compress the `text/event-stream` content type.

## Health probes

Use `GET /health/live` as the unauthenticated liveness probe. It returns no
infrastructure report and does not test external dependencies.

Use `GET /health/ready` as the readiness probe and include
`x-monitoring-secret: <HEALTH_CHECK_SECRET>`. The secret is mandatory validated
runtime configuration and must be supplied through the deployment secret
store. Readiness currently covers disk space, heap memory, and PostgreSQL. A
failed dependency check returns `503`; a missing or incorrect monitoring secret
returns `401`.

Redis is deliberately excluded from readiness even after configuring
Transmit. Losing the best-effort refetch signal must not remove otherwise
healthy PostgreSQL-backed REST traffic from service. Redis failure should be
visible through transport errors and monitoring, while clients recover by
refetching durable notification state.

## Application logging

`APP_NAME` and `LOG_LEVEL` are mandatory runtime configuration. Production logs
remain structured and are written to stdout for container collection. Preserve
the request ID field when forwarding or indexing logs; it is the primary way to
correlate lines emitted while handling one API request.

Request IDs are diagnostic only. They must not be treated as authentication,
authorization, session, or idempotency values. SvelteKit-to-API request-ID
forwarding has not yet been established, so the current guarantee covers the
API portion of a request.

Do not log passwords, session cookies, monitoring secrets, uploaded evidence
contents, or full request payloads. Expected client errors are intentionally
not reported as unexpected application failures.

## Atomic locks

`LOCK_STORE` must remain `database`. Run the locks migration before any API or
worker version that uses named locks. Atomic locks coordinate wider
cross-process work; they do not replace transactions or `FOR UPDATE`
revalidation.

## SMTP delivery

The SMTP mailer requires `MAIL_MAILER`, sender name/address, host, and port.
`SMTP_USERNAME` and `SMTP_PASSWORD` are optional only as a pair. Port `465`
enables a secure connection; other ports use the SMTP server's normal TLS
negotiation.

Email delivery belongs to the explicitly named `emails` application queue.
SMTP credentials must be supplied to the worker process that performs the
delivery.

## Private evidence storage

Development and tests select `DRIVE_DISK=fs`; production selects
`DRIVE_DISK=r2`. The local disk writes beneath `storage/evidence` and has no
HTTP serving route. R2 credentials must be scoped to the correct environment
and bucket. Production, staging, and backup namespaces must remain separate.

Do not enable public visibility or permanent public URLs. Evidence retrieval
must follow a fresh application authorization check and use either an
application-mediated response or a short-lived signed operation.

## Container process model

Build both images from the monorepo root:

```sh
docker build -f apps/api/Dockerfile -t matti-stock-api .
docker build -f apps/web/Dockerfile -t matti-stock-web .
```

The API image defaults to the HTTP server. Use the same image with this command
override for the worker:

```sh
node bin/console.js queue:work --queue=emails,reports
```

Run `node ace migration:run --force` as an explicit deployment task using the
new API image before starting the new server and worker revision. Do not put
migrations into either container's startup command.

Image build and server/worker runtime smoke checks were deliberately deferred
from Week 1 to the deployment stage. Treat the Dockerfile as an unverified
packaging definition until those checks pass.
