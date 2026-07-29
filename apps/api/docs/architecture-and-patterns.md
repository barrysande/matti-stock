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

## D7 — Liveness and readiness are separate operational boundaries

**Decision.** `GET /health/live` is a public, dependency-free process probe.
`GET /health/ready` runs the registered disk-space, heap-memory, and PostgreSQL
checks and is protected by a named middleware requiring the
`x-monitoring-secret` header to equal the validated
`HEALTH_CHECK_SECRET`. Redis is deliberately not part of readiness because it
transports best-effort SSE refetch signals rather than authoritative
application state.

**Why.** A liveness failure should tell an orchestrator to restart the process,
so it must not fail because an external dependency is temporarily unavailable.
A readiness failure should remove an otherwise live process from traffic, and
therefore includes the database that serves application state and the queue
adapter. The detailed readiness report exposes process and infrastructure
metadata, while the empty liveness response does not. A named middleware keeps
that protection reusable and out of controller business logic. Keeping
Transmit out of readiness lets durable PostgreSQL-backed requests remain
available during a temporary loss of live notification nudges.

## D8 — Errors and logs preserve framework-native typing and request context

**Decision.** VineJS validation failures retain Tuyau's native
`{ errors: SimpleError[] }` contract. Other application-controlled failures use
the compact `{ code, message }` shape with stable Adonis-style `E_*` codes.
HTTP status remains the primary protocol classification; the code identifies
the application condition without requiring consumers to parse messages.

AdonisJS request ID generation remains enabled. Request-handling code uses
`ctx.logger`, which includes that ID automatically. Structured context is the
first logger argument, caught errors use the `err` key, and log messages must
not contain credentials, cookies, evidence contents, or complete request
payloads. Services outside HTTP request handling receive a logger through
dependency injection rather than using `console`.

Expected client failures with statuses `400`, `401`, `403`, `404`, and `422`
are returned normally but are not reported as unexpected application failures.
Unhandled server failures continue through the base exception reporter.

**Why.** Preserving VineJS's response avoids replacing Tuyau's official
validation-error narrowing with a custom type layer. Stable codes make
non-validation failures machine-readable while messages remain suitable for
humans. Request IDs make concurrent API log lines attributable to one request
without using identity or session data as a correlation mechanism. Separating
expected client failures from server failures keeps operational error logs
actionable.

## D9 — Atomic locks coordinate through PostgreSQL

**Decision.** AdonisJS Lock exposes only its database store, backed by the
`locks` table. Development, tests, the HTTP process, and queue workers all use
that store. A named atomic lock may coordinate a cross-process critical
section, but it never replaces a Lucid transaction, row-level lock, final state
revalidation, or idempotency check.

Every use must define a resource-specific key, bounded lifetime, acquisition
behavior, and failure outcome. The foundation test acquires one named lock,
rejects a competing immediate acquisition, releases it, and proves a successor
can acquire it.

**Why.** An in-memory test store would exercise different coordination
semantics from production and cannot coordinate separate processes.
PostgreSQL is already the authoritative concurrency system, while Redis is
reserved for best-effort Transmit delivery.

## D10 — Redis transports Transmit signals but does not own application truth

**Decision.** Transmit uses its Redis-specific transport import with a
`matti-stock:transmit` key prefix and a 30-second ping interval in development
and production. Tests use Transmit's process-local transport so unrelated Japa
tests do not require Redis.

Transmit routes are not registered before session authentication exists.
Week 2 must apply authentication to every Transmit route and explicitly
authorize every private channel before the browser client is connected.
Notification rows and other durable state remain in PostgreSQL; Transmit only
signals clients to refetch.

**Why.** The HTTP server owns SSE connections while a separate queue-worker
process may create a notification. Redis bridges those processes without
becoming another queue or persistence system. Deferring route registration
prevents the package default—public subscriptions for channels without an
authorization callback—from becoming an accidental API.

## D11 — Application email is SMTP delivery from the emails queue

**Decision.** AdonisJS Mail has one SMTP mailer with environment-controlled
sender identity, port-derived secure transport, and optional paired username
and password credentials. A partial credential pair fails application boot.
Email features enqueue application jobs on the existing `emails` PostgreSQL
queue; they do not introduce Mail's separate messenger queue.

**Why.** SMTP remains portable across the institute's eventual provider, while
the existing worker supplies one visible retry and failure boundary for all
email work.

## D12 — Evidence storage is private on every disk

**Decision.** Drive exposes a private `fs` disk for development and tests and a
private S3-compatible `r2` disk for production. The local disk does not
register a file-serving route. R2 uses Cloudflare's required `auto` region and
an environment-provided endpoint, bucket, and credentials.

An evidence feature must still authorize access, validate extension, MIME type,
signature and size, assign an opaque key, persist immutable metadata, and
mediate retrieval. Selecting a Drive disk alone does not make an object
publicly accessible.

**Why.** Local storage keeps development independent of cloud credentials,
while matching production's private-access semantics. The Drive boundary
allows the storage implementation to change by environment without weakening
the domain or authorization boundary.

## D13 — One API image runs two explicit process roles

**Decision.** The API Dockerfile compiles one standalone AdonisJS image. Its
default command runs `node bin/server.js`; the queue service overrides that
command with
`node bin/console.js queue:work --queue=emails,reports`. The processes run in
separate containers with the same image version.

The SvelteKit application has a separate adapter-node image because it is an
independent runtime and deployment unit. Both Dockerfiles build from the
monorepo root so pnpm's lockfile and the web app's linked Tuyau registry remain
available.

**Why.** Sharing the API image prevents HTTP and worker code from drifting
while preserving independent health, restart, scaling, and log lifecycles.
Keeping the web runtime separate preserves the accepted BFF boundary.

## D14 — Deployment bootstrap is one-shot and registry data is separate

**Decision.** Stable permissions, system roles, their initial versions, and
permission memberships are created by the access-registry seeder. The Master
Admin bootstrap service does not create or reconcile that registry. It requires
the active `MASTER_ADMIN` role version 1 with `access.root`, then atomically
creates the institute root when absent, the unverified person and invited
account with an undisclosed generated temporary credential, the
institution-wide role assignment, its initial password-setup challenge, and
its access audit event.

The bootstrap is a one-shot deployment action. A duplicate identity is an
explicit conflict rather than a signal to reconcile mutable names, role
versions, assignments, or account state.

The deployment seeder validates its environment input, resolves the bootstrap
service through the AdonisJS container, and queues password-setup delivery only
after the database transaction commits. The durable job payload contains only
the challenge identifier. The worker resolves the current challenge, account,
and person, creates the purpose-bound token immediately before delivery, and
uses the shared mail shell.

**Why.** Registry ownership remains independent from the identity that receives
the registry's root role. One-shot creation avoids brittle pseudo-idempotency
after legitimate organizational, identity, or role evolution. Synchronous
delivery of the generated credential is unnecessary because the account holder
replaces it through the setup challenge. Queueing the challenge identifier puts
slow delivery work on the worker from the start without persisting a
recoverable password or token.

## D15 — Bouncer policies own request authorization

**Decision.** HTTP authorization uses AdonisJS Bouncer policies. Controllers
will call distinct policy actions instead of performing role or permission
checks directly. Policies may use private query helpers for checks shared by
their own actions; a generic authorization service will not be introduced
before multiple policies demonstrate a real shared resolution requirement.

The initial access policy grants account administration only to an `ACTIVE`
account with a currently effective `access.root` assignment at the active
institute using `INCLUDE_DESCENDANTS`. Expired, future, department-scoped,
node-only, missing-permission, and archived-role grants are denied. No role name
or universal administrator flag bypasses those checks.

**Why.** Policies are Bouncer's structured, dependency-injection-aware
authorization boundary and keep controllers declarative. Requiring the exact
database-backed permission, validity interval, and institution scope preserves
the accepted separation between access administration and business authority
without building an abstraction before its consumers exist.

## D16 — Application mail uses one responsive presentation shell

**Decision.** Application mail classes render both responsive, table-based HTML
and a plain-text alternative. A shared mail layout owns the Matti Stock
masthead, hidden preheader, mobile behavior, card structure, typography,
reusable content rows, link fallback, HTML escaping, and footer. Individual
mail classes provide only their action-specific content.

Dynamic values are escaped before HTML interpolation. Email content remains
concise and exposes only the detail needed to identify and complete the
applicable action. A typographic masthead is used until an approved Matti Stock
brand asset exists; an unrelated framework or reference-project logo is not
embedded.

**Why.** Centralizing email-safe markup keeps transactional messages consistent
as new workflows are added, while HTML and plain-text alternatives preserve
usability across modern, restrictive, and accessibility-oriented mail clients.
Keeping dynamic data escaped and message-specific content narrow protects the
security boundary established for notification email.

## D17 — Account writes return messages and holders set their own passwords

**Decision.** Master Admin account creation is an authenticated
`POST /accounts` write. The controller authorizes
`AccessPolicy.createAccount` through the request's Bouncer instance, validates
the request with Vine, and passes the inferred payload to the account
administration service. PostgreSQL owns email and staff-number uniqueness, and
constraint code `23505` is translated through `DuplicateException`.

The service atomically creates the person, an `INVITED` account with an
undisclosed system-generated temporary password, an `INITIAL_SETUP` challenge,
and append-only creation/setup audit events. Lucid hashes the temporary password
before persistence; the readable value is never returned, logged, audited,
mailed, or queued. Only after commit does the controller enqueue credential
delivery. Queue-dispatch failure does not roll back or hide the committed
account; the message-only `201` response reports whether delivery was queued,
and the neutral recovery route can issue a superseding setup challenge.

Initial setup and password reset share one challenge/redemption service and
tables, differentiated by a required purpose. Tokens are one-hour,
purpose-bound, supersedable, and single-use. Initial setup hashes the
holder-chosen password, verifies the person's primary email, increments the
credential and challenge versions, records `ACCOUNT_PASSWORD_SET`, and creates
no session. First successful login still performs `INVITED -> ACTIVE`.
Setup-pending versus reset is determined by the person's official-email
verification state, since every local account has a non-null AuthFinder
credential hash.

Read controllers use Transformers. Write controllers return only a concise
message because the client redirects or invalidates page data after a
successful mutation and reloads authoritative state. Write responses do not
return newly written resources or readable credentials.

**Why.** An undisclosed high-entropy placeholder keeps every local account
compatible with AuthFinder without giving the administrator a usable
credential. Holder-chosen credentials avoid administrator knowledge and
durable readable secrets while preserving an official-channel onboarding
boundary. Transactional challenge creation prevents partial identities, and
post-commit queueing prevents email latency from extending the database
transaction. Message-only writes avoid returning stale duplicate state that
the next page load will immediately fetch again.

## D18 — Account lifecycle changes serialize root authority and invalidate credentials

**Decision.** Master Admin account lifecycle writes use authenticated command
routes under `/accounts/:id` for suspension, restoration, deactivation, and
reactivation. Each controller authorizes its matching `AccessPolicy` action,
validates a required reason, and returns only a concise message.

Lifecycle services acquire a PostgreSQL `FOR UPDATE` lock on the stable
`access.root` permission row before locking and revalidating the actor and
target accounts. This shared serialization point prevents concurrent root
holders from suspending or deactivating one another and leaving the
application without effective root access. The narrow
`AccessRootAuthorityService` owns the exact current-root query used by both the
policy and this transactional invariant. Future role, assignment, delegation,
and hierarchy writes that can change effective `access.root` must use the same
serialization convention.

Every accepted transition increments the account's credential and password
challenge versions once, invalidating existing sessions and credential
challenges without deleting role assignments or history. Verified deactivated
accounts return to `ACTIVE` without an administrative password reset.
Unverified deactivated accounts return to `INVITED` and receive a fresh
purpose-bound `INITIAL_SETUP` challenge. The challenge is created atomically
with the reactivation event, but its durable `{ challengeId }` email job is
queued only after commit.

Lifecycle audit events retain the actor, target, validated reason, previous and
resulting status, and previous and resulting credential/challenge versions.
Self-suspension, self-deactivation, invalid transitions, changed actor
authority, and last-root lockout attempts are stable application conflicts
rather than generic server errors.

**Why.** Status checks alone block new logins but do not invalidate sessions or
supersede outstanding credential links. Version changes close those paths
without rewriting authority history. A shared database row lock prevents the
write-skew race that a simple “another root exists” count would allow, while
the focused resolver keeps policy and transaction semantics from drifting.
Post-commit delivery keeps email availability outside the database
transaction and preserves a committed reactivation when queue dispatch fails.

## D19 — Account reads use a safe directory and current-access overview

**Decision.** Authenticated account reads are exposed through `GET /accounts`
and `GET /accounts/:id`. The controller authorizes `AccessPolicy.list` or
`AccessPolicy.view` before validating filters or querying account data. Both
actions currently require effective institution-wide `access.root` authority.

`AccountDirectoryService` owns the read queries separately from account
administration writes. The directory uses fixed 20-row pagination, stable
display-name ordering, and optional search, lifecycle-status, and setup-status
filters. Setup status is derived from official-email verification, matching the
password-setup convention established for account writes.

Account Transformers expose only the person and account fields required by the
directory. The overview adds role assignments whose time range is current and
whose role and organizational scope are not archived. Each assignment includes
its versioned role identity, scope, dates, and reason. Account credentials,
credential versions, password-challenge data, and request audit context are not
serialized.

Delegations are omitted until the delegation model and effective-access rules
exist; the API does not publish a misleading always-empty collection. The
append-only access-event timeline remains a separate read feature because it
has distinct event-selection and disclosure decisions.

**Why.** A dedicated read service keeps filtering and eager-loading out of the
controller without mixing projections into transactional lifecycle code.
Transformer allowlists make the administrative response safe by construction,
and returning only presently relevant assignments matches the accepted manual
access-overview requirement while preserving historical records for the later
audit timeline.
