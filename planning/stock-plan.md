# Stock Management System — V1 Delivery Plan

## Plan Control

| Field                          | Value                                            |
| ------------------------------ | ------------------------------------------------ |
| Status                         | Approved implementation baseline                 |
| Plan start                     | 27 July 2026                                     |
| Production target              | 31 October 2026                                  |
| Delivery model                 | One developer, milestone-based vertical delivery |
| Product scope                  | `prd.md`                                         |
| Detailed rules                 | `system-design.md`                               |
| Deferred product-guidance work | Area 14, developed with the interfaces           |

This plan converts the accepted PRD into weekly delivery targets. Dates are
planning boundaries rather than permission to move incomplete work forward. A
workflow is complete only when its critical rules, authorization, audit
history, mobile interface, and tests work together.

<!--
IMPLEMENTATION REFERENCE:
Before scaffolding or changing a shared development convention, inspect
/home/bbs/Documents/completed-projects/mdp/v2.

Check:
- apps/api/.claude/monorepo-setup.md
- apps/api/docs/architecture-and-patterns.md
- apps/api/docs/deployment-notes-from-dev.md
- docker-compose.yml, pnpm-workspace.yaml, app Dockerfiles, and the existing
  Tuyau/cookie-forwarding implementations.

Reuse the monorepo, ADR, dev-flow, Docker Compose, API/BFF, documentation, and
deployment patterns that fit this product. Do not copy MDP's three-app product
structure or domain decisions automatically. Ask the user when the stock
requirements, current framework docs, or desired workflow leave a choice.
-->

## Implementation Reference and Working Agreement

The durable repository-wide collaboration rules live in
[`../AGENTS.md`](../AGENTS.md). They govern planning, documentation,
implementation, debugging, command execution, and verification throughout this
project. App-level rules may specialize them but shall not weaken them.

The implementation shall use the MDP v2 repository above as the primary local
reference for the developer's established monorepo and development patterns.
It is a pattern reference, not a source repository or an authority over this
stock system's accepted requirements.

The stock repository shall establish equivalent durable documentation:

- per-app working rules;
- a chronological ADR/architecture-and-pattern log;
- production-facing development/deployment notes;
- implementation progress records; and
- short direct comments that explain why rather than restating code.

The approved initial workspace baseline is:

- `apps/api` for the AdonisJS 7 API;
- `apps/web` for the SvelteKit/Svelte 5 application;
- no initial `packages/types` package, because the API's generated Tuyau
  registry is the typed application boundary;
- local host ports `5434` for PostgreSQL, `5051` for pgAdmin 4, and `6380` for
  Redis; and
- app-specific official framework references and working rules under each
  app's `.codex/` directory.

The generated Tuyau contract shall follow the API's routes, controllers,
transformers, validation, and exposed return types. Persisted model types alone
shall not be treated as the public response contract.

For every feature, plan inline with the developer before implementation.
Present the outcome, intended files, unresolved decisions, viable options and
tradeoffs, recommendation, migrations, dependencies, tests, documentation, and
operational effects, then wait for explicit approval. If implementation
evidence introduces a material new choice, pause and return to the developer
instead of treating the original approval as open-ended.

Work from the provided local framework/reference docs, propose dependency
changes before installing them, and avoid reverse-engineering `node_modules`
when an authoritative reference or a targeted user question can resolve the
issue. Debug from concrete evidence and involve the developer with a focused
question when the available evidence is insufficient. After a completed
feature, propose a concise commit message grouped by changed app, but do not
commit unless asked.

Before adopting a pattern that is not settled in this plan, inspect the
applicable MDP rule/reference and the current local framework documentation.
If the information is missing or the choice could materially change the
implementation, ask the user instead of guessing or reverse-engineering a
dependency.

The user controls execution of project bash scripts. When a script or command
must be run, first provide:

- the exact script or command;
- why it is needed;
- what it is expected to read, create, change, or contact; and
- any material risk or expected output.

The user will evaluate and run it, then provide the result. Do not execute
project bash scripts implicitly. Dependency installation also requires explicit
approval.

## 1. Delivery Strategy

### 1.1 Build vertical workflows

Each milestone should leave a usable end-to-end capability rather than isolated
tables or screens. For example, Central Store intake is not complete until a
Store Supervisor can submit it, invalid data is rejected, quantity/value
history is written atomically, current stock changes, evidence is linked, and
the action appears in the audit timeline.

### 1.2 Establish cross-cutting foundations early

The following should be introduced before many domain workflows depend on them:

- authentication and request-scoped authorization;
- people, organizational scope, and person-level approval separation;
- human-readable code generation;
- append-only event/history conventions and rebuildable projections;
- transaction, row-lock, idempotency, and domain-error patterns;
- Japa functional-test database setup and factories;
- persistent notification and SSE refetch-signal foundations;
- private Cloudflare R2 evidence storage;
- audit metadata and entity timelines; and
- responsive layout, forms, validation, and retained input conventions.

### 1.3 Use a backend-first cadence inside each vertical slice

Each milestone remains end to end, but implementation shall minimize context
switching by completing one coherent API block before its UI block.

Use this sequence:

1. **Define the slice:** state the user journey, screens/actions, database
   changes, state transitions, authorization, API contract, and acceptance
   cases. A short field list or wireframe is enough to expose UI needs before
   the API shape is fixed.
2. **Build the API:** implement migrations, models, domain services,
   transactions, validators, policies, controllers, routes, transformers, and
   critical Japa tests.
3. **Stabilize the typed boundary:** regenerate Tuyau, verify the read/write
   response contract, and prepare useful local fixtures.
4. **Build the UI:** implement SvelteKit server loads and form actions,
   responsive screens, retained form state, permission-aware actions, errors,
   and current-state feedback.
5. **Exercise the complete journey:** run the accepted success/rejection paths
   through the UI, make the small API adjustments exposed by integration, and
   update tests and durable notes.

The entire project's API shall not be completed before UI work begins. No
milestone may leave an API-only backlog. Avoid more than roughly three
consecutive implementation days on one workflow without exercising its
intended UI. When a milestone is too large for that limit, split it into
coherent sub-slices such as movement request/release, receipt/discrepancy, and
return/loan.

### 1.4 Test with development

Critical tests belong to the week that introduces the rule. Testing is not a
separate October cleanup phase.

Every week should end with:

- typecheck and lint passing;
- applicable Japa unit/functional tests passing;
- migrations reproducible from an empty development/test database;
- no known unauthorized path around the delivered workflow; and
- a representative smartphone-width check.

Testing shall start with Japa and its Japa/AdonisJS-native plugins only. Do not
introduce Jest, `@japa/expect`, Chai, Mocha, or another parallel stack unless a
specific unmet testing need is explained and approved.

### 1.5 Keep the V1 boundary fixed

The October commitment excludes offline synchronization, procurement,
accounting, multitenancy, QR/barcodes, component relationships, native mobile
apps, custom reports, and other deferred capabilities. A material new request
must receive an impact assessment before entering this plan.

## 2. Release Milestones

| Milestone                                  | Target | Outcome                                                                            |
| ------------------------------------------ | ------ | ---------------------------------------------------------------------------------- |
| M0 — Design baseline                       | 27 Jul | PRD, design decisions, areas, and delivery plan ready                              |
| M1 — Platform and authority                | 9 Aug  | Deployable skeleton, tests, authentication, people, organization, roles, and scope |
| M2 — Institutional stock register          | 30 Aug | Catalogue, identifiers, Central Store intake, valuation, evidence, and correction  |
| M3 — Operational accountability            | 20 Sep | Transfers, issues, receipt, custody, possession, returns, and loans                |
| M4 — Exception and financial flows         | 4 Oct  | Condition, damage, loss, recovery, repair, write-off, reinstatement, and disposal  |
| M5 — Stock-taking and institutional output | 18 Oct | Stock-take, reconciliation, reports, exports, notifications, and data-quality work |
| M6 — Release candidate                     | 25 Oct | Integrated staging release passes internal checks and first UAT cycle              |
| M7 — V1 production                         | 31 Oct | UAT corrections pass, production is deployed, and handover is complete             |

## 3. Weekly Delivery Targets

### Week 1 — 27 July to 2 August

**Focus:** repository, architecture, and repeatable development foundation.

Deliver:

- pnpm monorepo with AdonisJS API and SvelteKit/Svelte 5 application;
- shadcn-svelte base UI and smartphone-first shell;
- Tuyau generation and request-scoped SvelteKit server client;
- cookie forwarding and `Set-Cookie` propagation;
- PostgreSQL/Lucid configuration and initial migration conventions;
- AdonisJS native queue, database lock, Transmit, Redis, mail, and R2
  configuration boundaries;
- one Dockerfile/image supporting API and worker start commands;
- a local Docker Compose setup patterned after MDP v2, adapted for this
  repository's PostgreSQL, pgAdmin 4, and Redis development services;
- a pgAdmin 4 connection for visually inspecting tables, constraints,
  relations, migrations, and test/development data;
- local/test environment templates without committed secrets;
- Japa with its Japa/AdonisJS-native assertion, API-client, authentication, and
  Lucid database plugins. Database cleanup helpers and factories begin with
  Week 2's first real domain models rather than creating disposable Week 1
  placeholder models;
- per-app working rules, ADR/architecture log, implementation-progress notes,
  and deployment notes patterned after the MDP v2 documentation flow;
- health endpoint, structured error format, logging convention, and first ADR;
  and
- automated typecheck, lint, test, and build commands.

Exit evidence:

- clean install can migrate, boot API/frontend, execute a worker, and run the
  initial passing functional test;
- SvelteKit can make an authenticated-style typed request to AdonisJS; and
- Docker definitions support the API server, named-queue worker override, and
  adapter-node web runtime. Image build and runtime smoke verification is
  explicitly deferred to the deployment stage.

### Week 2 — 3 to 9 August

**Focus:** identity, institutional structure, and authority.

Deliver:

- people, organizational actors, user accounts, and unique identity rules;
- deployment-created Master Admin;
- login, logout, generated-password reset, suspension/revocation, session
  invalidation, and login rate limiting;
- institute, department, optional sub-department, and organizational-scope
  management;
- physical-location hierarchy foundation;
- permission registry, reusable roles, assignments, and effective scope;
- Store, Stock, Finance, Stock Taker, and Master role seeds;
- person-level proposal/approval separation helper;
- versioned role-permission changes;
- whole-role delegation with reason, exact dates, recipient acceptance, and
  synchronous expiry; and
- initial account/access audit timelines.

Critical tests:

- one person cannot bypass separation through another role/account;
- revoked, expired, or suspended authority cannot start new work;
- valid historical work remains attributed after authority changes;
- Master Admin has access administration but no implicit stock/Finance power;
  and
- department-scoped users cannot access sibling-department records.

Milestone: **M1 — Platform and authority**.

### Week 3 — 10 to 16 August

**Focus:** catalogue and classification.

Deliver:

- category hierarchy and archive-safe administration;
- fixed/consumable stock type;
- individual/quantity tracking-method selection with guidance;
- base-unit definitions and countable/measured precision rules;
- catalogue-item creation based on interchangeability;
- system-generated permanent catalogue codes;
- optional unique institute asset numbers and optional manufacturer serials;
- controlled category attributes and catalogue/inventory-unit scopes;
- canonical catalogue and inventory routes;
- catalogue keyword/code lookup foundation; and
- responsive creation, list, detail, and history screens.

Critical tests:

- permanent codes are unique and never reused;
- duplicate protected external identifiers are rejected;
- countable units reject fractional quantities;
- attribute scope cannot be casually changed after use; and
- component/composite relationships cannot be created.

### Week 4 — 17 to 23 August

**Focus:** Central Store intake and stock ledger.

Deliver:

- individual inventory units and quantity balances;
- human-readable inventory-unit codes;
- opening, acquisition, donation/grant, external-transfer, and other
  provenance;
- Central Store custody/location defaults from explicit intake context;
- atomic batch creation and retained invalid form data;
- explicit initial condition;
- acquisition-date precision and recording metadata;
- exact KES minor-unit valuation, unknown value, and batch/unit allocation;
- moving weighted-average quantity-value projection;
- private PDF/DOCX R2 upload and authorized retrieval foundation;
- attachment metadata, checksum, evidence link, and supersession handling; and
- current-stock register foundation with entity intake/valuation timeline.

Critical tests:

- one invalid/duplicate batch row rejects the entire write;
- quantity, condition allocation, and value reconcile atomically;
- unknown value is not stored or displayed as zero;
- value allocation retains every minor unit;
- only Store Supervisors can create stock; and
- unauthorized evidence cannot be retrieved.

### Week 5 — 24 to 30 August

**Focus:** intake correction and a complete institutional stock register.

Deliver:

- intake correction/reversal proposal;
- approval by a different Store Supervisor;
- compensating quantity/value records and projection rebuild checks;
- current stock filters for category, type, location, custody, condition, and
  valuation completeness;
- data-quality flags generated by opening/intake uncertainty;
- first current-stock PDF/Excel output;
- entity timelines and global-audit query foundation; and
- first demonstrable path: create catalogue item → receive stock centrally →
  view quantity/unit, value, location, custody, evidence, and history.

Critical tests:

- proposer cannot approve their own intake correction;
- material changes invalidate earlier approval;
- reversal never deletes the intake or original value;
- current projections match preserved source records; and
- report totals match the authorized query.

Milestone: **M2 — Institutional stock register**.

### Week 6 — 31 August to 6 September

**Focus:** requests, reservation, source release, and movement.

Deliver:

- departmental stock request and destination authorization;
- transfers, consumable issues, possession handovers, and custody transfers;
- canonical `PENDING_RELEASE → IN_TRANSIT → COMPLETED` model;
- pre-release cancellation;
- reservation and permitted pending amendment rules;
- source release with locked quantity/state revalidation;
- exact independent-unit batch selection;
- quantity/value allocation between source and destination;
- persistent notification foundation and direct authenticated SSE refetch
  signals; and
- pending-action operational screens.

Critical tests:

- reservation prevents double allocation;
- increase is rejected when unreserved availability is insufficient;
- concurrent release cannot create negative stock;
- stale or duplicate release is idempotently rejected/returned;
- independent units do not move through inferred relationships; and
- movement value preserves institution-wide totals.

### Week 7 — 7 to 13 September

**Focus:** receipt, discrepancies, issues, and returns.

Deliver:

- authenticated and single-use email recipient confirmation;
- full, partial, rejected, and disputed receipt;
- discrepancy records while unresolved quantity remains in transit;
- completed consumable issues without destination balance creation;
- linked return creation and dual confirmation;
- custody, current holder, and physical-location effects applied explicitly;
- reminder jobs for outstanding release/receipt; and
- movement/accountability timelines and initial report.

Critical tests:

- source actor cannot also satisfy an independently required receipt;
- partial receipt completes only the received allocation;
- recipient rejection cannot silently restore source stock;
- a completed transfer creates the right destination balance;
- a completed issue removes active quantity/value without destination stock;
  and
- return completion requires both physical sides.

### Week 8 — 14 to 20 September

**Focus:** temporary possession and accountable holdings.

Deliver:

- exact-date individual-unit loans;
- overdue derivation and notifications;
- borrower-requested, custodian-approved/rejected reloan;
- no-transit same-holder reloan;
- onward-loan movement for a different holder;
- `RETURNED` and `RELOANED` closing outcomes;
- current-holder and custody views;
- outstanding loans/returns reporting; and
- end-to-end Central Store → department → holder accountability demonstration.

Critical tests:

- one active loan per unit;
- due date cannot be overwritten;
- pending reloan does not hide overdue status;
- requester cannot approve their own reloan;
- returned state requires completed return; and
- custody does not change merely because possession changes.

Milestone: **M3 — Operational accountability**.

### Week 9 — 21 to 27 September

**Focus:** condition, damage, missing stock, and recovery.

Deliver:

- functional-condition assessments and quantity condition partitions;
- physical-damage cases and interim-use/quarantine disposition;
- exact damage-quantity allocations and preserved resolution history;
- missing report and immediate availability restriction;
- investigation findings and independent confirmed-loss decision;
- quantity loss partitions;
- transit-loss linking;
- recovered-stock report, recipient confirmation, inspection, and
  `RECOVERY_HOLD`; and
- urgent missing/loss notification behavior.

Critical tests:

- condition changes preserve total quantity;
- damage does not silently change functional condition;
- missing does not silently change custody/location or prove wrongdoing;
- loss confirmer cannot be reporter/holder/investigator;
- recovery returns current loss status to present without erasing history; and
- other restrictions survive recovery.

### Week 10 — 28 September to 4 October

**Focus:** repair, financial consequence, reinstatement, and disposal.

Deliver:

- repair cases with independent origins;
- `OPEN → IN_REPAIR → COMPLETED` and pre-work cancellation;
- exact successful/unsuccessful quantity outcomes;
- post-repair assessment;
- second-opinion/new-attempt linking;
- financial repair authorization/reference;
- write-off proposal and Finance approval/rejection;
- recovery-related reinstatement proposal and Finance decision;
- disposal proposal, financial authorization, Store physical completion, and
  evidence;
- sale, outgoing donation, scrap/destruction, and applicable disposal methods;
  and
- condition/exception and Finance-summary report foundations.

Critical tests:

- overlapping active repairs cannot claim the same unit/quantity;
- repair outcome does not automatically claim `WORKING`;
- unsuccessful repair cannot be edited into success;
- confirmed loss does not automatically write off;
- write-off does not automatically dispose;
- reinstatement cannot exceed the referenced unrestored write-off; and
- replacement creates new stock rather than inheriting old history.

Milestone: **M4 — Exception and financial flows**.

### Week 11 — 5 to 11 October

**Focus:** stock-take setup, counting, and concurrent activity.

Deliver:

- human-readable stock-take exercises and explicit scopes;
- activation baseline and immutable amendments;
- assignments and draft count work;
- partially blind quantity counts and explicit individual-unit presence;
- condition/location observations;
- immutable submission with `counted_at` and `recorded_at`;
- blind second/third recount rules;
- intervening-transaction reconciliation;
- active-exercise overlap detection and authorization; and
- late, not-counted, unidentified, cancelled, and aborted handling.

Critical tests:

- active operations do not create false discrepancies;
- expected quantity remains hidden before first submission;
- submitted counts cannot be edited;
- the same person cannot perform required independent recount;
- overlapping scope blocks by default; and
- in-transit stock is not counted at source or destination.

### Week 12 — 12 to 18 October

**Focus:** discrepancy resolution, finalization, reports, and automation.

Deliver:

- discrepancy investigations and linked resolution processes;
- separately proposed/Finance-approved reconciliation adjustments;
- stale approved-adjustment revalidation;
- `READY_FOR_CLOSURE` derivation;
- independent finalization and immutable closed snapshot;
- post-closure findings;
- all five fixed report families;
- final PDF and Excel exports;
- scoped global search and audit log;
- complete data-quality worklist;
- notification severities, action links, escalation schedules, and low-stock
  crossing behavior; and
- initial user guidance for every delivered role.

Critical tests:

- observations cannot directly change stock;
- physical loss cannot use generic reconciliation decrease;
- finalization blocks while required work remains;
- later activity cannot alter the closed snapshot/report;
- escalation never grants authority or changes state;
- low-stock alerts do not repeat for every transaction below threshold; and
- search/report/audit scope cannot expose unauthorized records.

Milestone: **M5 — Stock-taking and institutional output**.

### Week 13 — 19 to 25 October

**Focus:** integration hardening and first institutional UAT cycle.

Deliver:

- complete staging deployment using the release-candidate image;
- production-like API, worker, PostgreSQL, Redis/Transmit, SMTP, Traefik, and R2
  configuration;
- migration rehearsal from a clean database;
- integration tests across workflows that affect each other;
- concurrency tests for high-risk balances, approvals, and finalization;
- responsive checks on representative smartphones/browsers;
- permission-matrix and evidence-access review;
- backup execution and staging restoration rehearsal;
- representative seed/UAT data and named role accounts;
- guided first UAT cycle with Store, Stock, Finance, Stock Taker, recipient,
  and Master Admin representatives; and
- triaged defect/change-request register.

Exit evidence:

- all critical automated tests pass in the release candidate;
- every PRD acceptance journey has a completed UAT result or an assigned
  blocking defect;
- new requests are separated from defects; and
- no unresolved data-integrity/security defect is accepted for production.

Milestone: **M6 — Release candidate**.

### Week 14 — 26 to 31 October

**Focus:** correction, UAT retest, production, and handover.

Deliver:

- correction of release-blocking accepted-scope defects;
- targeted regression tests for every correction;
- institutional retest and UAT acceptance;
- final production VPS hardening;
- named non-root, key-only SSH access and UFW rules;
- Dokploy, Traefik/TLS, API, worker, PostgreSQL, Redis, SMTP, and R2 production
  configuration;
- explicit migration and deployment run;
- backup schedule, monitoring, health checks, and failure alerts;
- production smoke test using approved sample/initial users;
- ICT runbooks for deployment awareness, health checks, backup verification,
  restoration, log access, and escalation;
- application workflow/user guidance refined from UAT;
- credential and infrastructure-ownership handover;
- removal of the developer's standing SSH access unless a separate active
  support agreement requires it; and
- production acceptance record.

Milestone: **M7 — V1 production by 31 October 2026**.

## 4. Critical Test Worklist

This is the minimum high-risk test inventory. Individual specifications should
be created alongside each feature.

| Test group           | Required evidence                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------- |
| Authority            | Allowed and rejected role/scope paths; person-level separation; expiry/revocation         |
| Intake               | Atomic batches; duplicate rejection; condition/value reconciliation; correction approval  |
| Quantity/value       | No negative balance; exact minor-unit allocation; unknown-value behavior                  |
| Movement             | Reservation, amendment, release, partial receipt, issue, return, idempotency              |
| Custody/possession   | Explicit independent effects; dual confirmation; loan/reloan/overdue                      |
| Condition/damage     | Exact partitions; no silent cross-state changes; resolution allocation                    |
| Loss/recovery        | Independent confirmation; restrictions; transit loss; preserved history                   |
| Repair/disposal      | Non-overlap; immutable outcome; write-off/disposal separation; reinstatement bounds       |
| Stock take           | Blind counts; recount independence; concurrency; investigation; stale adjustment; closure |
| Evidence             | File validation; private access; domain scope; supersession                               |
| Reporting/audit      | Query/export totals; closed snapshot reproduction; authorization scope                    |
| Queues/notifications | Idempotent jobs; durable truth; SSE refetch; escalation without authority                 |

The test suite should optimize for decision coverage, not a vanity percentage.
Low-risk visual variations may remain manual in V1; rules capable of corrupting
stock, value, authority, or history may not.

## 5. Definition of Done

A feature is done only when:

- its accepted business rule works through the intended user interface;
- server-side validation and authorization enforce it independently of the UI;
- its transaction either commits completely or leaves no partial domain state;
- applicable quantity/value projections reconcile with preserved source
  records;
- actor, role assignment, reason, and times appear in the audit history;
- corrections follow append-only rules;
- critical success, rejection, stale-state, and concurrency paths are tested;
- the interface works at representative smartphone width;
- relevant notifications, reports, evidence, and data-quality effects are
  connected;
- migrations work from a clean database and through the current staging state;
  and
- implementation guidance or an ADR records non-obvious choices.

## 6. UAT Plan

UAT is performed by institute representatives in staging. It verifies that the
implemented system supports their actual work; it does not replace automated
testing.

### Required role journeys

1. Master Admin creates structure, account, roles, scope, and delegation.
2. Store Supervisor creates catalogue/intake stock with value and evidence.
3. A second Store Supervisor approves an intake correction.
4. Stock Supervisor requests stock; Store releases; recipient confirms.
5. Consumables are issued and acknowledged without creating destination stock.
6. A loan is created, becomes due, is returned or reloaned, and is confirmed.
7. Stock Taker records condition/damage and performs a blind count/recount.
8. Stock Supervisor investigates missing/damaged stock and manages repair.
9. Finance Supervisor decides valuation, write-off, reinstatement, and
   disposal-related financial actions.
10. Store completes authorized physical disposal with evidence.
11. Stock-take discrepancy is investigated, adjusted when valid, and finalized
    by an independent supervisor.
12. Authorized users search, inspect timelines, and produce scoped PDF/Excel
    reports.

### Feedback classification

- **Defect:** the accepted PRD/design behavior is missing or works incorrectly.
  It is corrected within delivery.
- **Usability correction:** wording or interaction prevents the agreed user
  from completing the accepted flow. It is assessed against Area 14 and the
  delivery target.
- **Change request:** new behavior or a changed business rule beyond the
  baseline. It is documented and separately estimated rather than inserted
  silently.

## 7. Delivery Risks

| Risk                                                 | Effect                                      | Control                                                                 |
| ---------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------- |
| New requirements enter during build                  | October target slips or quality falls       | Freeze V1; assess every material change                                 |
| Institutional feedback is delayed                    | Workflow or UAT blocks                      | Named decision-maker and scheduled demonstrations                       |
| UAT starts too late                                  | Real operational mismatch appears at launch | Prepare users/data early; begin UAT in Week 13                          |
| Complex workflows interact unexpectedly              | Regression or inconsistent state            | Vertical development and continuous critical tests                      |
| Solo-developer overload                              | Testing/docs are sacrificed                 | Weekly exit criteria; cut deferred work, not integrity controls         |
| Testing-learning curve                               | Early work moves slower                     | Build helpers/factories in Week 1; repeat patterns                      |
| Staging/production infrastructure is late            | Deployment rehearsal is compressed          | Request VPS, domain, SMTP, R2, and access well before Week 13           |
| Opening data is incomplete                           | Initial register contains uncertainty       | Store-controlled capture plus data-quality worklist                     |
| Too few independent officers                         | Required approvals/counts cannot complete   | Confirm and seed multiple eligible role holders before UAT              |
| R2/SMTP/network configuration fails                  | Evidence or confirmation is unavailable     | Exercise integrations in staging and preserve retry/fallback history    |
| Discounted build creates implicit future obligations | Unfunded support and scope growth           | Keep delivery, defect, maintenance, and new-feature boundaries explicit |

## 8. Institute Inputs and Dependencies

The institute must provide in time for the applicable milestone:

- the Master Admin's verified identity and official contact channel;
- initial institute/department/sub-department and physical-location structures;
- officers assigned as Store, Stock, Finance, and Stock Taker representatives;
- recipient email/contact information used for confirmation;
- initial catalogue/category/unit terminology and opening-stock access;
- sample valuation, repair, loss, disposal, and stock-take evidence;
- staging and production VPS procurement;
- domain/DNS, SMTP, Cloudflare R2, and Dokploy ownership/access;
- ICT administrator participation in backup/restore and handover;
- UAT participants and scheduled availability; and
- acceptance authority for the final production release.

Delays in these inputs must be recorded as delivery dependencies rather than
hidden as development inactivity.

## 9. Handover and Support Boundary

The delivered scope includes:

- the working accepted V1;
- source, migrations, critical tests, and implementation documentation;
- staging and production deployment;
- UAT defect correction and production smoke testing;
- backup/restore and operational runbooks; and
- ICT handover.

After handover, the institute's ICT administrator performs routine server,
health, and backup checks. The developer does not retain standing production
SSH access without a separate support agreement.

The delivery obligation covers defects against the accepted V1 baseline. It
does not include:

- routine SRE/monitoring work after handover;
- operating-system or platform administration;
- indefinite maintenance;
- new reports, workflows, integrations, or other features; or
- changes to an accepted business rule.

If requested, developer SRE support may be contracted separately at an
indicative **KES 30,000–50,000 per month**, with exact duties, included hours,
response targets, access, backup responsibilities, and exclusions stated in
that agreement. Out-of-scope features are separately estimated at normal
commercial rates without inheriting the V1 discount.

## 10. First Actions for the Implementation Conversation

1. Confirm the repository/package layout and create the monorepo skeleton.
2. Read the MDP v2 reference paths listed in this plan and identify which
   monorepo/dev-flow conventions apply unchanged or require a user decision.
3. Apply the root `AGENTS.md` working agreement and establish app-level
   `.codex`, ADR, progress, and deployment-note locations.
4. Present every required scaffold/install/bash command with its purpose and
   effects for the user to evaluate and run.
5. Configure AdonisJS, SvelteKit, Tuyau, PostgreSQL, pgAdmin 4, Japa, Docker
   Compose, and local environment handling.
6. Define the append-only/history and current-projection coding conventions.
7. Implement the first health/authentication vertical slice API and tests, then
   its complete UI and end-to-end check.
8. Track Week 1 deliverables directly in this plan and update status without
   rewriting the accepted PRD.
