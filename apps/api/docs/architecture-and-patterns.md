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
provisioning service. PostgreSQL owns email and staff-number uniqueness, and
constraint code `23505` is translated through `DuplicateException`.

The service atomically creates the person, an `INVITED` account with an
undisclosed system-generated temporary password, an `INITIAL_SETUP` challenge,
and append-only creation/setup audit events. Lucid hashes the temporary password
before persistence; the readable value is never returned, logged, audited,
mailed, or queued. Only after commit does the controller enqueue credential
delivery. Queue-dispatch failure does not roll back or hide the committed
account; the message-only `201` response reports whether delivery was queued,
and the neutral recovery route can issue a superseding setup challenge.

Initial setup and password reset share challenge and redemption tables,
differentiated by a required purpose. Challenge issuance and token creation are
separate from credential redemption. Tokens are one-hour,
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
application without effective root access. `AccessRootAuthorityService` owns
the exact current-root query used by both the policy and this transactional
invariant, along with the shared account-locking and actor-revalidation guard
for root-authorized writes. Future role, assignment, delegation, and hierarchy
writes that can change effective `access.root` must use the same serialization
convention.

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

## D20 — Administrators initiate recovery but never control account passwords

**Decision.** An effective Master Admin may request credential recovery for a
selected account through authenticated
`POST /accounts/:id/password-reset`. `AccountsController.resetPassword`
authorizes `AccessPolicy.resetPassword` before validating the required reason.
The account holder still chooses the credential through the existing
purpose-bound setup or reset endpoint; the administrator never supplies,
receives, or learns a password or recovery token.

Administrative issuance locks the shared `access.root` mutation row, then the
actor and target accounts, and revalidates the actor's current root authority
inside the transaction. A verified account receives a `RESET` challenge. An
unverified account receives a replacement `INITIAL_SETUP` challenge.
Deactivated accounts reject recovery until restored through their explicit
lifecycle workflow. Suspended accounts may receive a reset link without being
restored, and an administrator may send their own holder-controlled recovery
link.

Challenge issuance increments `passwordResetVersion`, superseding prior links
without invalidating current sessions. Session invalidation remains a
consequence of successful password replacement; immediate access removal uses
account suspension. The request event records the Master Admin as its account
actor with the target, validated reason, challenge purpose, identifier, and
version.

The existing email job remains the only delivery path and receives only
`{ challengeId }` after the transaction commits. A queue-dispatch failure is
logged and reflected in the message-only response without rolling back or
hiding the committed recovery request.

**Why.** Reusing holder-controlled credential replacement prevents
administrator password knowledge while adding accountable directory-based
recovery. Transactional authority revalidation closes the policy-to-write race,
and post-commit queueing keeps email availability outside the credential and
audit transaction.

## D21 — Single responsibility governs functional-module boundaries

**Decision.** A validator, policy, ability, transformer, controller, or service
edited for functionality remains at or below 300 lines. Line count is a
guardrail rather than the design objective: one of these modules is split as
soon as it owns multiple independent reasons to change, even when it is
shorter than 300 lines. Services are divided by business capability, and
unrelated behavior is not hidden in generic helpers or compressed formatting
to satisfy the count.

Routes, tests, models, jobs, exceptions, migrations, generated files, schema
snapshots, planning documents, and chronological architecture and deployment
records are exempt from the numeric limit. Their framework, historical, or
verification structure does not use the same functional-module boundary.

**Why.** Small files are useful only when their boundaries communicate why the
code changes. Treating single responsibility as the primary metric keeps
services composable and reviews intelligible, while the numeric ceiling catches
files whose responsibilities are beginning to accumulate.

## D22 — Account and password services align to command responsibilities

**Decision.** Account administration is separated into provisioning, lifecycle,
and credential-recovery services. Password challenge issuance, purpose
selection, anonymous recovery requests, and token creation belong to
`PasswordChallengeService`; password replacement and challenge redemption
belong to `PasswordCredentialService`.

Controllers inject only the command services required by each action.
Lifecycle and administrative credential recovery share the serialized
root-authority guard through `AccessRootAuthorityService`, while provisioning
and lifecycle both use the challenge issuer without taking ownership of
credential-delivery or redemption behavior.

**Why.** Provisioning, lifecycle transitions, recovery authorization, challenge
issuance, and credential replacement change for different business reasons.
Explicit collaborators preserve the existing transaction and queue boundaries
while keeping each service reusable and independently reviewable.

## D23 — Organizational structure is strict, versioned, and access-impact aware

**Decision.** V1 organizational custody and permission scope use one strict
three-level structure:

```text
Institute
└── Department
    └── optional Sub-department
```

The deployment-created institute is the single active root. A department must
belong directly to that institute, and a sub-department must belong directly
to a department. Unit types are immutable. Independent parentless departments
or sub-departments are not supported because they would sit outside the
institution-wide access and accountability path.

`organizational_units` is the current projection used by foreign keys and
current queries. Every creation, rename, reparent, archive, or restoration
also writes an immutable, consecutively numbered
`organizational_unit_versions` record containing the effective name, type,
parent, archive state, actor, reason, and validity interval. The previous
current version closes in the same transaction. Changes become effective when
the command commits; V1 does not backdate or schedule future hierarchy
changes.

Active sibling names are unique case-insensitively. Departments cannot be
reparented away from the institute; only sub-departments may move between
active departments. The institute cannot be archived, active children must be
moved or archived before their parent, and restoration proceeds from parent to
child. Reads return unambiguous full paths and Transformer-controlled current
and historical fields.

Creating, reparenting, archiving, or restoring a unit requires an access-impact
preview. `POST /organizational-units/:id/access-impact` uses `:id` as the
parent for `CREATE_CHILD` and as the affected unit for the other operations.
It returns active or upcoming role assignments whose direct or
`INCLUDE_DESCENDANTS` reach would change, plus a deterministic fingerprint.
The write recalculates that fingerprint after acquiring the shared
`access.root` mutation lock and revalidating the actor. A changed hierarchy or
assignment set rejects the stale preview before any mutation.

Provisioning, lifecycle administration, impact calculation, directory reads,
and version/audit persistence use separate services. All writes return only a
message and append an access event with the validated reason and structural
change.

**Why.** A strict rooted hierarchy guarantees that every custody and
organizational permission scope belongs to the institute. Effective-dated
versions preserve the structure that applied to historical work without
forcing every existing foreign key through a temporal join. Preview
fingerprints make descendant-access consequences visible and prevent a
reviewed impact from being silently replaced by a different concurrent state.
Reusing the root mutation lock keeps hierarchy and access administration in
one serialization domain.

## D24 — Physical locations use an independent flexible, versioned hierarchy

**Decision.** Physical places use a hierarchy that is independent from
organizational custody and permission scope. A location may be top-level or
belong to one other active location, and the hierarchy may be as deep as the
institute needs for campuses, buildings, floors, rooms, storage areas, shelves,
or bins. The system prevents self-parenting and descendant cycles.

`physical_locations` is the current projection used for current paths and
future stock-location foreign keys. Every creation, rename, reparent, archive,
or restoration also writes an immutable, consecutively numbered
`physical_location_versions` snapshot with its effective name, parent, archive
state, actor, reason, and validity interval. Changes take effect when their
transaction commits; V1 does not backdate or schedule them.

Active sibling names are unique case-insensitively, including among top-level
locations. A location with active children cannot be archived, and an archived
child cannot be restored until its parent is active. Reads return unambiguous
full paths and Transformer-controlled current and historical fields. Writes
require effective `access.root` authority, revalidate the actor under the
shared root mutation lock, append an access-administration event, and return
only a message.

Location changes do not use the organizational access-impact preview or its
fingerprint. V1 authorization is scoped through organizational units rather
than physical locations, so moving a location cannot change a role
assignment's effective reach. No `Central Store` location is seeded: each
institute records its real premises explicitly, and later stock intake refers
to that configured physical place without turning a display name into a
hard-coded system identity.

**Why.** Physical precision varies naturally across premises and therefore
does not fit the strict three-level organizational structure. Keeping a
separate current projection makes location selection and stock foreign keys
simple, while effective-dated versions preserve the paths that applied to
historical movements and reports. Omitting an access-impact workflow avoids
asking administrators to confirm authority consequences that physical
locations do not produce.

## D25 — Software-defined permissions feed configurable, immutable role versions

**Decision.** The application owns a stable registry of action-specific
permission keys. Master Admin may bundle permissions marked as
custom-role-assignable into centrally managed reusable roles, but cannot invent
new permission keys through the API. `access.root` is reserved for the
system-managed `MASTER_ADMIN` role; additional root holders receive that role
rather than constructing equivalent authority under another name.

The access-registry seeder creates the stable permissions and five initial role
definitions. `MASTER_ADMIN` remains protected and grants only `access.root`.
`STORE_SUPERVISOR`, `STOCK_SUPERVISOR`, `FINANCE_SUPERVISOR`, and
`STOCK_TAKER` are configurable starter roles whose initial memberships express
the accepted V1 responsibility boundaries. Rerunning the seeder creates
missing registry entries but never edits an existing immutable role version;
incompatible existing registry state fails explicitly.

Custom roles receive an opaque immutable `CUSTOM_<UUID>` key while their
user-facing names may change. Active names are unique case-insensitively.
Creating or materially changing a role requires at least one distinct,
assignable permission. A permission change appends a consecutively numbered
role version and never edits prior memberships. Existing assignments remain on
the version originally granted, and role reads expose older-version assignment
counts so replacement can be deliberate.

Only configurable roles may be renamed, re-versioned, archived, or restored. A
role with an active or upcoming assignment cannot be archived; assignment
ending and replacement remain explicit access-administration actions. All role
writes serialize on the shared `access.root` mutation lock, revalidate the
actor inside the transaction, append an access event, and return only a
message.

**Why.** A software-owned vocabulary keeps authorization predictable and
testable, while configurable starter roles provide useful deployment defaults
without freezing the institute's staffing model. Immutable versions prevent a
role edit from silently changing existing authority. Reserving the root
permission and requiring explicit assignment cleanup protect access
administration from misleading aliases and hidden mass revocation.

## D26 — Effective access is resolved once from immutable grants and append-only terminations

**Decision.** A role assignment is an immutable grant to one account, one
immutable role version, and one organizational scope. Immediate grants persist
the transaction time as their exact start; scheduled grants require a future
exact start. Every grant requires a reason and may have an exact expiry.
Invited and active accounts may receive assignments, but only an active account
can exercise one.

Ending, cancelling, and replacing assignments do not delete or rewrite the
original grant. A unique `role_assignment_terminations` record identifies the
terminal action, its effective time, actor, mandatory reason, and replacement
assignment when applicable. `ENDED` applies immediately to a current grant,
`CANCELLED` prevents an upcoming grant from starting, and `REPLACED` atomically
links the old grant to a new latest-role-version assignment. A scheduled
replacement keeps the old assignment effective until the replacement starts.

`EffectiveAccessService` owns the synchronous definition of effective
authority. It requires an active account, active role and organizational
scope, a started and unexpired grant, and no effective termination. It resolves
`THIS_NODE_ONLY` or `INCLUDE_DESCENDANTS` against the current strict
organizational hierarchy and returns the assignment, permission, declared
scope, and resolved scope that authorized an action. Separate active
assignments form a union. Root-policy checks, current-account access, account
overviews, hierarchy-impact previews, and role archival all consume this
shared definition rather than maintaining independent time and lifecycle
queries.

New grants accept a role identity rather than a role-version identity; the
service locks the role and selects its latest immutable version inside the
transaction. Overlapping grants for the same account, reusable role,
organizational unit, and scope mode are rejected. Assignments to suspended or
deactivated accounts and archived roles or scopes are rejected.

`access.root` remains valid only through the protected `MASTER_ADMIN` role at
the institute using `INCLUDE_DESCENDANTS`. Every assignment write uses the
shared root mutation lock and transactional actor revalidation. Root-affecting
termination and replacement must preserve continuous coverage from the present
through an open-ended root interval; this prevents both immediate and already
scheduled last-root gaps.

Assignment reads are exposed through a paginated directory and detail
resource. Directory rows carry only identity, account, lightweight immutable
role and scope, interval, and derived lifecycle data. Detail is a strict
superset that adds role-version currency and permissions, grant reason and
actor, current ineffectiveness reasons, and termination/replacement context.
Account overview uses the detail projection for its active and upcoming
grants, including grants currently blocked by account, role, or scope state.
Terminal history remains in the assignment directory, while the chronological
access-event timeline remains a later read slice.

**Why.** `starts_at` and `expires_at` cannot represent cancellation before a
future start without producing an invalid interval or destroying the approved
dates. A separate termination preserves both the original decision and the
later administrative decision. Central effective-access resolution prevents
policies, session projections, directories, hierarchy previews, and archival
guards from disagreeing as expiry, termination, account status, role state, or
organizational reach changes. Returning the effective assignment context also
establishes the attribution needed by later business-domain audit events
without coupling this slice to delegation or workflow reassignment.

## D27 — Delegation is append-only temporary coverage with a reversible single-overlap policy

**Decision.** Delegation is represented by four append-only records:
`delegations` stores one immutable proposal header and exact interval,
`delegation_assignments` links its complete source assignments,
`delegation_responses` stores one atomic `ACCEPTED` or `REJECTED` recipient
response, and `delegation_terminations` stores one early `REVOKED`,
`RELINQUISHED`, or `ADMINISTRATIVELY_TERMINATED` action. Proposal and
termination reasons are mandatory. Acceptance reason is optional; rejection
reason is mandatory.

One proposal has one delegator, one delegate, one interval, and one
whole-proposal response. Only the current effective direct holder may propose
its source assignments. The delegate may accept after the start but strictly
before expiry; authority requires both an accepted response and
`starts_at <= now < expires_at`. The delegator may revoke pending or accepted
coverage, the delegate may relinquish accepted coverage, and transactionally
revalidated direct `access.root` may terminate either administratively.
`MASTER_ADMIN`, any assignment containing `access.root`, self-delegation, and
re-delegation are prohibited.

Proposal creation acquires the shared access-mutation lock, locks the delegator
and delegate accounts, and locks every source-assignment row in deterministic
order. It then revalidates effective direct ownership, the known source end,
the protected-root rule, and interval overlap. If any item fails, the whole
proposal rolls back. A source may have at most one overlapping pending or
accepted delegation. Source-row locks make concurrent proposals serialize so
two requests cannot both observe an empty coverage interval.

The database intentionally does not make the source assignment globally
unique in `delegation_assignments` and does not install a permanent exclusion
constraint across proposal intervals. It preserves multiple historical
delegations while the provisioning service enforces the accepted V1
single-overlap rule. Rejected or terminated proposals do not block later
coverage. Basic future support for parallel delegates can therefore be
introduced by deliberately changing service policy, tests, and documentation
without rewriting historical rows; an explicit parallel-coverage mode or
additional approval workflow could still justify later schema changes.

`DelegatedAccessQueryService` is a storage collaborator that selects accepted,
started, unexpired, unterminated proposals for an active delegate. It does not
define source effectiveness. `EffectiveAccessService` remains the central
public resolver and intersects those links with its existing active account,
assignment, role, organizational-scope, hierarchy, and permission definition.
Direct and delegated grants form a union. Direct evidence is ordered first;
delegated evidence is deterministic by delegation start, delegation ID, and
source-assignment ID. Delegated evidence retains the source assignment,
delegator, delegate, and delegation.

Role-assignment lifecycle projection is separated into
`RoleAssignmentLifecycleService` so assignment status remains cohesive while
the central resolver stays within the functional-module boundary. Current
account output retains `roleAssignments` for direct appointments, adds
`delegatedRoleAssignments`, and unions both into `effectivePermissionKeys`.
Administrative account overview shows incoming and outgoing active or upcoming
delegations separately. Delegation directory reads are limited to the two
participants and effective root oversight.

Delegation changes access only. It does not rewrite the source assignment,
organizational appointment, custody, pending task ownership, or previously
completed work. A directly appointed Stock Supervisor remains the
manager-of-record; temporary coverage is presented separately. If one source
later becomes ineffective, only that item stops authorizing actions. A
delegation termination ends every item. Natural expiry is always checked
synchronously; no scheduler or queue is required for security correctness.

**Why.** Whole-assignment delegation is an escape hatch for temporary
managerial absence, not a capacity-planning mechanism. Parallel delegation
would multiply complete permission and organizational reach, allow more people
to initiate unrelated work, turn accidental duplicate proposals into access
expansion, and blur direct organizational responsibility. The institute has
therefore selected one overlapping coverage arrangement per source for V1.
Direct assignments, narrower reusable roles, or later task routing cover
legitimate parallel participation until operational evidence justifies
revisiting that policy. Enforcing the choice under service locks provides the
safe concurrency behavior needed now without freezing the data model around an
uncertain future rule.

## D28 — Directory summaries and detail resources use separate query graphs

**Decision.** Resource directories with both index and show workflows define a
`summaryQuery()` and a `detailQuery()`. Index and embedded account-directory
collections use the summary graph; show uses the detail graph. A detail
projection is a strict superset of its list projection where practical.
Mutation endpoints continue to return concise messages because the client
redirects to, or refreshes, the authoritative read resource after a successful
write.

Delegation summaries contain participants, proposal interval, derived
lifecycle, `effectiveItemCount`, `totalItemCount`, and lightweight source
assignment role, scope, source status, and per-item effectiveness. They omit
proposal reasons, response and termination audit actors, permission lists,
grant actors, and complete source-assignment termination context. Delegation
detail adds those fields and is the only delegation read that invokes the full
`RoleAssignmentTransformer` projection. Account overview deliberately embeds
delegation summaries because it is an account-oriented access overview rather
than a delegation audit resource.

Role-assignment directory rows likewise omit permissions, grant and
termination actors, reasons, role-version currency, and ineffectiveness
diagnostics; the assignment detail resource adds them. Role lists avoid
loading version audit actors and unused permission metadata, while role detail
retains complete version history. Accounts, organizational units, and physical
locations already followed lightweight-list/rich-detail response contracts;
their directory services now name the two query graphs explicitly. The
permission vocabulary remains list-only and therefore has no artificial
detail query.

Lifecycle remains derived rather than stored in a mutable status column.
Delegation participant visibility and delegation and role-assignment status
filtering remain SQL predicates so pagination is applied only after
authorization and filtering. Focused tests must keep each SQL status filter
aligned with the category returned by the applicable in-memory lifecycle
projection.

**Why.** Reusing a deeply preloaded detail graph for a paginated list multiplies
fixed relation queries, transfers audit data the list cannot display, and
couples routine navigation to the most expensive resource shape. Separate
graphs make read cost and response intent visible without weakening
authorization or creating a second lifecycle definition. Per-item and
aggregate effectiveness also prevent a partly effective whole-proposal
delegation from being presented as though every delegated assignment still
authorizes work.

## D29 — Expected database conflicts are translated narrowly and unexpected failures are sanitized

**Decision.** Controllers let service and infrastructure exceptions reach the
global HTTP exception handler unless they are handling a known recoverable
side effect after the primary transaction has committed. A service may
translate PostgreSQL unique violations into a safe `E_DUPLICATE` conflict only
when the reported constraint name is one of the constraints that workflow
explicitly expects. Other unique violations and all other unexpected database
errors remain server failures.

The global handler preserves typed client errors but replaces every unhandled
5xx response body with the fixed `E_INTERNAL_SERVER_ERROR` envelope. Error
reporting continues to receive the original exception. Known domain-conflict
codes are excluded from reporting individually; an otherwise unknown 409 is
still reported.

**Why.** Disabling debug output removes stack traces but does not make an
arbitrary exception message safe for an API response. Database messages may
contain SQL, schema names, constraint details, or submitted values. Narrow
constraint matching also prevents an internal uniqueness defect from being
misrepresented as a user-correctable duplicate.
