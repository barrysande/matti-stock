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

Redis is available at `127.0.0.1:6380` for the future Transmit cross-process
bus. It is not a queue backend or source of durable notification state.
