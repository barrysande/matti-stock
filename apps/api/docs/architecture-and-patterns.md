# API Architecture and Patterns

This is the chronological record of architectural and implementation patterns
adopted for `apps/api`. It records decisions and their reasons; code remains the
source for implementation details.

## D1 — One root pnpm workspace

**Decision.** The API is the `api` package inside the repository's single root
pnpm workspace and uses the root lockfile.

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
their approved workflows. The Notification model's `@afterCreate` hook sends
the Transmit broadcast directly.

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
dependency remains installed pending that feature.

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
`HEALTH_CHECK_SECRET`. Readiness excludes Redis because it transports
best-effort SSE refetch signals rather than authoritative application state.

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

Transmit route registration waits for session authentication. Week 2 must apply
authentication to every Transmit route and explicitly authorize every private
channel before the browser client is connected.
Notification rows and other durable state remain in PostgreSQL; Transmit only
signals clients to refetch.

**Why.** The HTTP server owns SSE connections while a separate queue-worker
process may create a notification. Redis bridges those processes without
becoming another queue or persistence system. Deferring route registration
prevents the package default from becoming an accidental API, i.e., public
subscriptions to channels that have no authorization callback.

## D11 — Application email is SMTP delivery from the emails queue

**Decision.** AdonisJS Mail has one SMTP mailer with environment-controlled
sender identity, port-derived secure transport, and optional paired username
and password credentials. A partial credential pair fails application boot.
All email features enqueue application jobs on the existing `emails`
PostgreSQL queue.

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
delegate role and permission checks to distinct policy actions. Policies may
use private query helpers for checks shared by their own actions. A generic
authorization service requires a demonstrated resolution need shared by
multiple policies.

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
and a plain-text alternative. A shared mail layout owns the MaTTI Stock
masthead, hidden preheader, mobile behavior, card structure, typography,
reusable content rows, link fallback, HTML escaping, and footer. Individual
mail classes provide only their action-specific content.

Dynamic values are escaped before HTML interpolation. Email content remains
concise and exposes only the detail needed to identify and complete the
applicable action. A typographic masthead is used until an approved MaTTI Stock
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

Read controllers use Transformers. Write controllers return a concise message
and never expose readable credentials. After a successful mutation, the client
redirects or invalidates page data and reloads authoritative state.

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
rather than generic server errors. Self-suspension and self-deactivation reuse
the stable `E_ACCOUNT_SELF_ADMINISTRATION` exception type, while each lifecycle
workflow supplies its specific user message.

**Why.** Status checks alone block new logins but do not invalidate sessions or
supersede outstanding credential links. Version changes close those paths
without rewriting authority history. A shared database row lock prevents the
write-skew race that a simple “another root exists” count would allow, while
the focused resolver keeps policy and transaction semantics from drifting.
Post-commit delivery keeps email availability outside the database
transaction and preserves a committed reactivation when queue dispatch fails.

## D19 — Account reads use a safe directory and detailed current access

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
directory. The detail response adds role assignments whose time range is
current and whose role and organizational scope are not archived. Each
assignment includes its versioned role identity, scope, dates, and reason.
Account credentials,
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
permission keys. Master Admin may bundle registry permissions marked as
custom-role-assignable into centrally managed reusable roles. `access.root` is
reserved for the system-managed `MASTER_ADMIN` role; additional root holders
receive that role rather than constructing equivalent authority under another
name.

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

`DelegationScopeCompatibilityService` defines the conservative V1 recipient
boundary from existing access facts. A candidate qualifies for a source only
through a currently effective direct, non-root assignment in the same top-level
department branch; department and sub-department scopes share that branch,
while an institution-scoped source requires direct institution-scoped
eligibility. The qualifying assignment must have no known effective end before
the delegation expiry. Delegated grants never qualify a recipient.

The authenticated `GET /delegations/proposal-options` resource batches this
compatibility resolution, paginates only matching active accounts, exposes only
their ID, display name, and official email, and returns proposal-ready direct
source projections. Selecting a candidate narrows the sources to compatible
assignments. Provisioning and acceptance reuse and transactionally revalidate
the same service rule, so presentation does not become an authorization
decision. Compatibility is an eligibility rule at proposal and acceptance;
after acceptance the delegation is the explicit bounded temporary appointment
and is not silently coupled to a later unexpected change in the recipient's
qualifying assignment.

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

Delegation affects access while leaving the source assignment, organizational
appointment, custody, pending task ownership, and previously completed work
unchanged. A directly appointed Stock Supervisor remains the
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

## D30 — Account access timelines expose direct history through a fail-closed projection

**Decision.** The initial access-event read is the root-authorized
`GET /accounts/:id/access-events` timeline. It is account-specific rather than
a premature global audit log. The query includes events directly targeting the
account, events targeting role assignments owned by the account, and events
targeting delegations in which the account is the delegator or delegate. It
does not include unrelated actions merely because the selected account acted
as administrator, nor does it infer indirect effects from role,
organizational-unit, or physical-location administration.

The timeline uses fixed 20-row pagination ordered by event time and ID in
descending order. It supports category and exact-event-type filters. Effective
`access.root` is required and is authorized before filter validation or account
lookup. Self-service timeline visibility and the later permission-scoped global
audit log remain separate disclosure decisions.

`AccessEventTransformer` is a fail-closed boundary. It returns the event
identity, category, time, reason, system or lightweight account actor, stable
target identity, optional assignment or delegation context, and only
event-specific allowlisted details. It never returns raw metadata, request IP
or request ID, identifier fingerprints, challenge identifiers, credential
versions, password-reset versions, or actor email and staff data. A future
unknown event type retains its safe core envelope with an empty detail object
instead of exposing new metadata or disappearing from history.

Assignment and delegation context is resolved in bounded page-level batches.
If a polymorphic target cannot be resolved, the event remains visible with its
stable target type and ID. Authorization context is returned only when the
event actually preserved an authority assignment or effective permission; the
read model does not fabricate historical evidence absent from older writes.

**Why.** The account overview is the first concrete Week 2 consumer and has an
existing root-only authorization boundary. Relational ownership avoids treating
unstructured JSON metadata as query truth, while a strict transformer allowlist
prevents security and credential internals from becoming an accidental audit
API. Deferring indirect-resource inference and institution-wide audit filters
keeps this slice useful without fixing the later global audit architecture
before its domain and scope requirements exist.

## D31 — Independent participation is enforced through pairwise person identity

**Decision.** `PersonSeparationService` enforces each established independent
participation rule by comparing the two participants' stable `personId`
values. Account IDs, role keys, role assignments, wider authority, and direct
or delegated authorization evidence cannot make one person count as two
independent participants.

Pairwise comparison is the deliberate boundary. A workflow calls
`assertDifferentPeople` once for each accepted exclusion, such as proposer
versus approver, reporter versus confirmer, or counter versus finalizer. The
service does not accept a generic participant set, invent participant roles,
build an approval graph, or decide which workflow combinations require
separation. Those rules remain explicit in the consuming domain workflow.

The guard has no endpoint, validator, transformer, database query, or mutable
state. A consuming workflow must load and lock its exact proposal version,
revalidate the acting account's current authority, retain the returned
authorization evidence, and pass the proposal's stored person identity and
the acting account's person identity to the guard inside the transaction. A
conflict throws the stable `E_PERSON_PARTICIPATION_CONFLICT` domain error.

The comparison occurs when the independent action is attempted. A later
account, role, assignment, delegation, or hierarchy change does not
retroactively invalidate a properly recorded historical decision. The
eventual decision record must preserve the proposal version, acting account,
acting person, and exact authorization evidence used at that time.

**Why.** Independence is a relationship between people, not credentials or
grants. A small pairwise guard is sufficient for every currently accepted
separation rule and keeps each domain workflow readable. A generic
participant-set engine would hide which two responsibilities must be
independent and would create a workflow abstraction before concrete proposal
models and state transitions exist.

## D32 — Descendant organizational names omit structural suffixes

**Decision.** Department and sub-department names are normalized at the API
domain-service boundary before uniqueness checks, version creation, auditing,
and persistence. A trailing `Department`, `Sub-department`, or `Sub Department`
suffix is removed case-insensitively, repeated structural suffixes are removed,
and ordinary internal words remain unchanged. A value containing only a
structural suffix is rejected. Institute names are not normalized because the
institute is the sole organizational root and its institutional title may be
part of its proper name.

Web guidance asks administrators for the name only, but the API remains the
authoritative boundary so alternate clients and later imports cannot store a
different representation. Existing records are not rewritten implicitly.

**Why.** Unit type already records whether a descendant is a department or
sub-department. Repeating that classification in the name creates inconsistent
labels and makes paths, filters, uniqueness, and reporting less predictable.
Normalizing immediately before persistence keeps every write path consistent
without coupling the invariant to one user interface.

## D33 — Blocked accounts cannot authenticate or replace credentials

**Decision.** `SUSPENDED` and `DEACTIVATED` accounts cannot sign in, request a
password challenge, receive an administrator-issued credential-recovery
challenge, or redeem an otherwise-current password setup or reset challenge.
This supersedes D20's allowance for administrators to issue recovery challenges
to suspended accounts. Restoring or reactivating the account through its
explicit lifecycle workflow must occur before credential recovery can begin or
complete.

Credential verification returns a discriminated result so invalid credentials
remain distinct from a verified account whose status blocks sign-in. Both
blocked statuses share the public code `E_ACCOUNT_SIGN_IN_UNAVAILABLE` and the
same user-facing message, while the rejection audit event retains the exact
account status. An incorrect password always produces the neutral invalid-
credentials response, even when the matching account is blocked.

Anonymous recovery continues to return the same neutral success response for
unknown and blocked accounts, but creates no challenge or email job for either.
Administrative recovery rejects both blocked statuses as the same account-state
conflict. Credential redemption rechecks the locked account status in addition
to the lifecycle version guard, returns the shared blocked-account message for a
valid current link, and records the exact status internally. Malformed,
expired, wrong-purpose, superseded, and redeemed links retain their existing
generic invalid-or-expired response.

**Why.** Suspension and deactivation are access-control states, so allowing a
blocked holder to initiate or complete credential replacement creates an
unnecessary credential workflow while access is intentionally unavailable.
Checking status at issuance and redemption protects both boundaries, while the
existing lifecycle version increments continue to invalidate links issued
before a status transition. Neutral anonymous requests prevent account-status
enumeration, and a shared public message gives a holder with verified
credentials or a valid challenge a useful next step without exposing the
internal lifecycle distinction.

## D34 — Catalogue classifications use current projections with authorized effective history

**Decision.** Catalogue categories and base units use small current-state tables
for ordinary reads plus append-only, effective-dated version tables for their
complete administrative history. A category version snapshots its name,
required description, parent, archive state, change kind, reason, actor, and
exact catalogue authorization. A base-unit version snapshots its name, symbol,
countable/measured kind, precision, archive state, change kind, reason, actor,
and the same authorization evidence. The authorization snapshot retains the
source role assignment, optional delegation, `catalogue.manage`, and resolved
institute organizational unit through restricted foreign keys rather than a
polymorphic metadata-only event.

Authenticated accounts may read active or explicitly requested archived
definitions and their history. Mutation requires `catalogue.manage` resolved
at the active institute root; technical `access.root` and lower organizational
scopes do not qualify. Policies reject unauthorized requests before payload or
resource validation. Each write transaction then locks the actor and the
direct or delegated authority evidence, re-resolves the grant, and rejects a
changed grant before modifying domain state.

The category hierarchy is limited to three levels. Structural writes lock its
small institution-wide row set in stable order, then revalidate active parents,
cycles, descendant depth, and archive/restore ordering. PostgreSQL partial
indexes remain the final concurrent guard for active sibling names. Base units
use corresponding active-only, case-insensitive name and symbol indexes plus
database checks requiring precision zero for countable units and precision one
through three for measured units. An omitted measured precision resolves to
three in the domain service. Active-only uniqueness allows a replacement unit
to reuse an archived label while making restoration conflict explicitly.

Category descriptions own both inclusion guidance and optional examples; no
separate examples column is created. Unit kind and precision may still be
edited during Slice 2 because catalogue items do not yet exist. The catalogue-
item slice must add the accepted used-unit guard before a unit can be referenced
and must then prevent ordinary semantic changes after use.

**Why.** Current projections keep shared lookup lists direct, while relational
versions preserve why each definition changed and the exact authority that
allowed it. Transactional revalidation closes authority and hierarchy races,
and database constraints protect invariants under concurrent requests. Keeping
examples inside the required description and delaying the used-unit check until
the referencing model exists avoids duplicate fields and placeholder domain
relationships.

## D35 — Keep stateless value transformations as domain helpers

**Decision.** Small deterministic transformations that neither coordinate a
workflow nor depend on application state are exported as named functions from
domain-specific modules under `app/utils/`. Category-name normalization and
base-unit normalization and detail resolution therefore use `category.ts` and
`baseunit.ts` helpers rather than injectable single-method service classes.

Services remain the boundary for substantive application responsibilities such
as persistence workflows, transactions, authorization, history, hierarchy
coordination, and directory queries. A rule may still live in a helper when it
only validates and resolves supplied values without coordinating those concerns.

**Why.** Function helpers expose the actual stateless dependency directly and
avoid constructor injection, allocation, and mocking seams that provide no
benefit. Domain-specific modules retain clear ownership without prematurely
forcing differently evolving names, symbols, keywords, or other values through
one generic normalizer.

## D36 — Category attributes separate mutable projections, governed history, and future use locks

**Status.** Superseded by D40. This entry preserves the former implementation
decision for chronology; category attributes and their integrations no longer
exist in the API.

**Decision.** Category attributes and predefined choices use current projection
tables plus independent append-only, effective-dated version tables. Definition
versions snapshot the exact category, label, optional guidance, type,
requiredness, scope, lifecycle, reason, actor, and exact institute-root
`catalogue.manage` evidence. Choice versions independently snapshot label,
display order, lifecycle, reason, actor, and the same authorization evidence.
Choice changes do not manufacture misleading definition versions.

Applicability is exact-category only; directory queries never expand ancestors
or descendants. Active attribute names are case-insensitively unique within an
exact category. Active choice labels and positive display positions are unique
within a predefined-choice attribute. Choice creation and ordering lock the
owning attribute first and choice rows in stable UUID order. Reordering shifts
positions within the transaction before assigning the requested complete
permutation so the partial unique position index remains an effective final
concurrency guard.

The longest choice-version foreign-key, composite-unique, and supporting-index
identifiers use explicit short names. PostgreSQL truncates identifiers to 63
bytes, so relying on Knex's generated names for this table would collapse
different constraints onto the same prefix during migration.

`category_attributes.semantics_locked_at` and
`category_attribute_choices.first_used_at` are monotonic current projections.
Ordinary attribute administration checks the former before changing category,
type, requiredness, or scope; ordinary choice administration checks the latter
before renaming or archiving a used option. Definition archival remains allowed
because it prevents new entry without rewriting historical values.

The removed attribute implementation deliberately created no placeholder
catalogue-item, attribute-value, or inventory-unit model and no dormant generic
value interface. The then-planned catalogue-item transaction had to lock active
exact-category catalogue-scoped definitions, validate their values, create the
item and values, and set the definition lock in the same transaction. Week 4
had to apply the corresponding contract to inventory-unit-scoped definitions
and set a selected choice's use marker atomically. Both consumers lock the
attribute before a selected choice and revalidate category, scope, type,
requiredness, and lifecycle after locking. The target and value records would
be authoritative history from which these markers could be explained or
rebuilt.

Stateless attribute-name, choice-label, and nullable-guidance normalization
lives in the domain-specific `category_attribute.ts` helper under `app/utils/`.
Provisioning, semantic administration, lifecycle administration, choice
administration, history, authority, and directory queries remain services
because they coordinate application state and transactions.

**Why.** Separate projections keep later entry forms and filters direct while
effective histories preserve administrative meaning and authorization. Locking
on the first affected target protects optional definitions whose value was
omitted as well as definitions with recorded values. Deferring concrete value
integration to its real consumers avoids speculative models while leaving an
explicit database and lock-order contract for the catalogue-item API and Week 4.

## D37 — Detail-read names follow the responsibility of each layer

**Decision.** A conventional resource detail request uses the resourceful
controller action `show`, a directory-service method named `findDetails`, and a
transformer variant named `forDetailedView`. This naming applies consistently
to accounts, organizational units, physical locations, roles, role assignments,
delegations, catalogue categories, and base units.

The word “overview” remains valid only when it names an actual summarized
domain concept, such as an account's nested access overview. It is not used as
a generic substitute for a resource detail query or representation.

**Why.** The controller, service, and transformer now read in the same natural
direction: show one resource, find its detailed data, and serialize its detailed
view. Keeping Adonis's resourceful `show` action while making the collaborating
method names explicit removes mental translation without coupling directory
queries to HTTP action names or changing response contracts.

## D38 — Catalogue items combine strict identity with reviewable similarity and typed history

**Status.** The identity, similarity, description, lifecycle, and versioning
parts remain current. D40 supersedes the typed-attribute/value parts.

**Decision.** Catalogue items use a small current projection identified publicly
by a PostgreSQL-sequence-generated `ITEM-000001` code. The database owns the
bounded, non-cycling sequence, exact format and uniqueness constraints, and a
trigger that rejects code updates. Database UUIDs remain internal. A separate
normalized name is permanently unique across active and archived items; exact
duplicates are conflicts, while near matches use a reasoned similarity review.

Similarity review uses normalized current names and relational keywords with
exact, keyword, prefix, and substring matching. Exact-category agreement raises
ranking but is not itself a candidate. Creation and identity-affecting changes
recompute the reviewed candidates beneath one PostgreSQL-backed atomic lock. A
SHA-256 fingerprint over the proposal and candidate codes, match kinds, and
current update times makes a stale review fail closed. Reviewed candidates and
the confirmation reason attach to the resulting catalogue-item version.

Catalogue keywords are ordered current projections with a normalized unique
key per item. Catalogue values use one generic relational projection with
mutually exclusive text, exact numeric, date, yes/no, and predefined-choice
columns. Database checks enforce the active type shape, and a composite foreign
key proves that a selected choice belongs to its attribute. Complete keyword
and value snapshots attach relationally to each effective-dated item version;
the current child projections may therefore be replaced without losing domain
history.

Catalogue-item transactions lock and revalidate exact institute-root
`catalogue.manage` evidence, the affected item when present, applicable
catalogue-scoped attributes in UUID order, selected choices, the category, the
base unit, and current child projections. Attribute applicability is reread
after the category lock so a concurrent definition change aborts rather than
silently changing required input. The transaction marks every active exact-
category catalogue definition as semantically used even when an optional value
is omitted, marks selected choices on first use, and marks a base unit on its
first catalogue reference.

`inventory_semantics_locked_at` is deliberately specific: it does not freeze
the catalogue item. Week 4's first holding transaction will set the monotonic
projection while holding the same item row lock. Name, description, keywords,
identification status, category, and compatible attribute corrections remain
reasoned and versioned. Only stock type, tracking method, and base unit leave
ordinary editing after first holding use and require a workflow that reconciles
affected holdings. The catalogue-item API creates no placeholder holding model
or mutation that sets this future marker.

Catalogue capture is description-first. No attributes are seeded or inferred;
an exact category may have none. A new optional definition introduced after
items exist locks immediately. A required definition cannot be introduced or
restored over incomplete existing items without controlled backfill. This keeps
the generic typed capability available without turning initial catalogue entry
into technical product-data collection.

**Why.** Permanent codes and strict normalized names prevent the same
interchangeable definition from fragmenting routine counts, while review catches
near duplicates that a unique index cannot recognize. Relational typed values
provide constraints only where the institute deliberately defines a field, and
complete snapshots preserve corrections without JSON interpretation. The
shared lock order and monotonic use markers protect meaning under concurrent
catalogue administration and future intake without prematurely implementing
Week 4 records.

## D39 — Service and controller workflows use semantic whitespace

**Decision.** API services and controllers use blank lines to separate distinct
workflow phases, including loading or authorization, validation, state
derivation, mutation, history recording, and response or return. Related
declarations, fluent query construction, and consecutive operations that form
one phase remain grouped. Whitespace must not change execution order or be used
to compress code around the 300-line functional-module limit.

In controllers, `HttpContext` members are destructured alphabetically. Policy
authorization, request validation, authenticated-user retrieval, domain work,
and response serialization are separate phases, with blank lines between them.
Awaited domain results are assigned to named local variables before a
Transformer or serializer consumes them. Controllers do not nest awaited
domain calls inside transformation or serialization expressions.
This keeps the security boundary and the origin of each input immediately
visible.

**Why.** Service workflows coordinate several responsibilities even when each
class remains focused. Making those phase boundaries visible reduces the effort
needed to trace authorization and transaction behavior, while keeping tightly
related statements together avoids turning short workflows into visual noise.

## D40 — Description-first catalogue and terminal category merge

**Decision.** Catalogue items use their required name and optional description
for shared recognition and specification detail. Category-specific attribute
definitions, choices, scopes, current values, value snapshots, routes, and use
locks are removed completely. The base-unit
first-use lock and catalogue-item identity, keyword, similarity, lifecycle, and
effective-history patterns remain unchanged.

Category merge is a two-step preview-and-apply workflow. The preview validates
the source and target, lists active child blockers and every directly affected
active or archived catalogue item, and fingerprints the relevant current state.
The apply workflow obtains the existing PostgreSQL-backed catalogue mutation
lock, locks authority and domain rows in stable order, rebuilds the preview,
and rejects a stale fingerprint before changing anything.

Administrators must reparent, merge, or archive every active child before
applying the merge. The web implementation may select one, several, or all
children and call the existing individual reparent operation; successful calls
remain successful, the preview is refreshed, and different subsets may be sent
to different destinations.

A successful merge moves all directly classified catalogue items while
preserving each item's lifecycle and description, appends item versions,
archives the source, records its direct target, and appends the source version
in the same transaction. The source description remains historical and
read-only; the target description continues through ordinary reasoned editing.
Later target merges form an allowed chain, and detailed reads resolve both the
direct target and the final canonical active target.

A merge is terminal. Application guards reject source restoration and ordinary
target archival, while database checks enforce merged-source archival and a
valid merge target. Partial unique indexes reserve a merged source's normalized
sibling name but continue to exclude ordinary archived, never-merged categories
so their established name-reuse behaviour remains available. A same-normalized
name remains valid beneath a different parent.

**Why.** Description-first capture accommodates different types of stock
without asking irrelevant questions such as computer specifications for
furniture. Explicit child handling makes hierarchy changes visible and
reversible before the terminal operation. Fingerprinting, stable locks,
database constraints, and append-only history make the merge effect reviewable
and atomic under concurrent use.

## D41 — Catalogue management capability and advisory category review are API-owned

**Decision.** The authenticated current-account response exposes
`canManageCatalogue`, calculated through the same institute-root
`catalogue.manage` authority service used by catalogue policies. The web uses
this capability to present mutation controls; a permission key alone remains
insufficient because the same key may be granted at a department scope.

Category creation has a policy-protected advisory review endpoint. It compares
the normalized proposed name with active, archived, and merged categories using
exact, prefix, and substring matches, ranks the selected parent first within a
match kind, and returns at most ten candidates with their full paths and
lifecycle state. Creation remains independently authorized and transactionally
validated. The review therefore warns about likely duplicates without becoming
a stale-sensitive confirmation protocol or replacing sibling uniqueness and
three-level hierarchy enforcement.

**Why.** Server-owned capability resolution prevents the browser from
reconstructing organizational authorization from incomplete assignment data.
Full-path category candidates make same-named classifications understandable,
while an advisory review satisfies the lightweight duplicate-warning need
without introducing a fingerprint where no destructive or bulk effect is being
approved.

## D42 — Paginate unbounded flat directories and version histories

**Decision.** Unbounded flat directories and append-only version histories use
fixed server-side pagination. Roles and base units use 20-row directory pages.
Their separate `/options` endpoints return the complete filtered collections
needed by selectors. Role, organizational-unit, physical-location,
catalogue-category, base-unit, and catalogue-item histories use dedicated
20-row endpoints in reverse version order. Current detail responses do not
embed complete version arrays.

Organizational units, physical locations, and catalogue categories remain
complete hierarchy reads. Their full collections are required to calculate and
present paths, descendants, valid parents, and merge choices. Permission
registries, current effective access, catalogue keywords, similarity-review
candidates, delegation assignment snapshots, and role-assignment ineffective
reasons also remain complete because their user tasks require the full bounded
set.

Each paginated endpoint authorizes before it validates the page query. Stable
secondary ordering remains part of each directory query. Pagination uses the
standard Transformer collection metadata so Tuyau exposes one consistent
contract to the web application.

**Why.** Flat directories and append-only histories can grow without a useful
upper bound, so loading all records increases response time and page cost.
Hierarchy pagination can hide required parent and descendant context and would
need more complex path-aware database queries. Keeping those hierarchies
complete is the simpler V1 design until measured data size shows a need for a
different hierarchy browser.

## D43 — Central Store context is an append-only root configuration

**Decision.** Central Store intake uses one append-only configuration-version
table. Each version stores the selected custodial organizational unit, physical
location, root actor, reason, immediate effective time, and consecutive version
number. The configuration uses record identifiers. A location or organizational
unit named `Central Store` has no special behavior until Root selects it.

`GET /central-store-context` returns the active version to Root or an account
with effective `intake.record` authority at the configured custodial unit.
`GET /central-store-context/history` and `POST /central-store-context` require
`access.root`. The initial read returns `data: null` until Root creates the first
version. Configuration, archive, and intake-authority transactions use the same
lock order: actor, current context, organizational unit, physical location, and
then the applicable business grant. The configured unit and location cannot be
archived until Root selects replacements. Rename and reparent operations remain
valid because the selected identifiers do not change.

The current-account contract exposes `canRecordIntake`. The API calculates this
capability through the same scope-aware service used by Central Store policy
checks. A raw `intake.record` permission key is not sufficient because a sibling
or unrelated scope must not create institutional stock.

`stock.read`, `valuation.read`, and `evidence.read` are separate assignable
permissions. Fresh installations include the complete current starter-role
memberships in version 1. An existing unchanged software starter version gets
one new immutable version. Existing assignments remain on their earlier role
versions, and an administrator-created latest version is never replaced by the
seed.

Physical-location lifecycle work is separate from rename and reparent
administration. This split keeps both services focused and below the repository
line limit while the lifecycle service owns the Central Store archive guard.

Role current-version projections use Lucid's PostgreSQL `distinctOn` query with
role and descending version order. They do not use a per-group limit, because
full-suite evidence showed that the limit could return an older version. The
query returns one version for each selected role. The separate paginated history
remains the only complete version-history read. The directory service places
the separately loaded version in Lucid `$extras`; it does not assign a plain
array to the model's relationship contract.

**Why.** Explicit identifiers prevent display names from controlling domain
behavior. Append-only versions preserve the context used by each later intake,
and archive guards prevent an invalid configuration. Scope-aware capabilities
and immutable starter-role upgrades preserve the accepted separation between
technical Root authority and stock business authority.
