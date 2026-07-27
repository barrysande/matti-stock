# API Architecture and Patterns

This is the chronological record of architectural and implementation patterns
adopted for `apps/api`. It records decisions and their reasons; code remains the
source for implementation details.

## D1 — One root pnpm workspace

**Decision.** The API is the `api` package inside the repository's single root
pnpm workspace. It does not own a nested workspace or lockfile.

**Why.** The API and web application share one dependency graph and lockfile.
This keeps Tuyau's generated registry link deterministic and prevents commands
run from different directories from resolving different dependency versions.

## D2 — PostgreSQL is the only application database

**Decision.** Lucid uses the `pg` connection configured through validated
environment variables. Schema generation remains enabled for AdonisJS 7 model
types.

**Why.** PostgreSQL is the accepted persistence and concurrency boundary for
domain transactions, row locks, queues, and database-backed atomic locks.
Keeping one configured dialect prevents development behavior from drifting
from staging and production.

## D3 — Database queues have explicit workload lanes

**Decision.** Background work uses AdonisJS Queue with its Lucid database
adapter and the `pg` connection. The initial worker drains the explicitly named
`emails` and `reports` queues.

**Why.** Email delivery and report generation are slow or failure-prone work
that should not hold open HTTP requests. PostgreSQL keeps jobs durable without
using Redis as a second persistence system. New queue names are introduced only
with the feature that needs them.

## D4 — Notification models broadcast a best-effort refetch signal

**Decision.** Business services create durable notification rows as part of
their approved workflows. The Notification model's `@afterCreate` hook owns the
Transmit broadcast. Services do not repeat Transmit calls, and notifications
do not use a queue merely to reach SSE clients.

**Why.** The notification table is authoritative; SSE only nudges connected
clients to refetch it. Centralizing transmission in one model hook keeps that
transport concern modular. A broadcast may arrive before its surrounding
transaction commits or may be missed entirely. That is accepted because the
broadcast does not change business state and clients always reload durable
notification data.

## D5 — Generator-owned files are excluded from manual style enforcement

**Decision.** Files that AdonisJS marks as automatically generated, including
`database/schema.ts`, are not edited, linted, or formatted manually. ESLint and
Prettier ignore them. Application models extend the generated schema and keep
project behavior in editable source files.

**Why.** A later generator run replaces these files. Manual changes create
temporary differences, risk being lost, and make the repository's style gate
responsible for output the application does not own. Generated TypeScript
remains covered by compilation.

## D6 — Scaffold authentication is not a product foundation

**Decision.** The generated public signup, access-token authentication,
profile, `User` model, and related migrations were removed before the first
database migration. Authentication will be introduced only through an approved
session-authentication feature based on the accepted people, account lifecycle,
authorization, and audit requirements. The already approved `@adonisjs/auth`
dependency remains installed but is not wired into the application meanwhile.

**Why.** Adapting the generic scaffold incrementally would preserve the wrong
public-registration and token-authentication assumptions and prematurely merge
people with login accounts. Starting the product feature from its accepted
requirements keeps the migration history reproducible and avoids treating
disposable scaffold behavior as a compatibility contract.
