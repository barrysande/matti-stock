# Stock Management System — Product Requirements Document

## Document Control

| Field | Value |
| --- | --- |
| Product | Single-institution stock management system |
| Release | V1 |
| Status | Approved for implementation |
| Requirements baseline | 27 July 2026 |
| Production target | 31 October 2026 |
| Primary institution context | Kenyan technical training institute |
| Authoritative design record | `system-design.md` |
| Planning roadmap | `system-design-areas.md` |

This PRD defines what V1 must deliver. `system-design.md` remains authoritative
for detailed rules, state transitions, edge cases, and the reasons behind each
decision. Where this document and the design record appear inconsistent, the
accepted decision in `system-design.md` takes precedence until the documents
are reconciled.

## 1. Product Summary

The product will provide one institutional record of fixed/non-consumable and
consumable stock from entry through allocation, use, movement, possession,
stock-taking, damage, loss, recovery, repair, write-off, reinstatement, and
disposal.

It is designed for non-technical institutional users, primarily working from
smartphones, while preserving the accountability and audit evidence required
to answer:

- What stock does the institute have?
- What is it worth?
- Where is it physically located?
- Which organizational unit is responsible for it?
- Who currently has it?
- What condition and availability restrictions apply?
- How did it enter, move, change, become lost, recover, or leave active stock?
- Who recorded, requested, confirmed, approved, corrected, or finalized each
  action?

The application begins at stock intake. Procurement, supplier selection,
purchase approval, payment, and general accounting remain outside its domain.

## 2. Problem Statement

The institute currently compiles stock information manually. The supplied
report shows inconsistent item descriptions, duplicated or ambiguous columns,
mixed condition terminology, difficult-to-trace totals, and limited ability to
reconstruct movements, responsibility, loss, or later correction.

This creates:

- slow and difficult audits;
- uncertainty about current quantities, values, locations, holders, and
  custodial responsibility;
- weak chains of custody for movements and issues;
- inconsistent handling of damage, loss, repair, and disposal;
- laborious report preparation; and
- difficulty correcting mistakes without losing the original record.

V1 must replace this fragmented operational record with controlled,
human-readable workflows and append-only history.

## 3. Product Objectives

V1 will:

1. Establish one searchable catalogue and current institutional stock register.
2. Centralize all ordinary incoming stock through the Store Supervisor and
   Central Store.
3. Track fixed/non-consumable stock individually or by quantity as appropriate.
4. Track consumable quantities in one defined base unit per catalogue item.
5. Separate custody, current possession, and physical location.
6. Require attributable source release and recipient receipt for stock leaving
   one party for another.
7. Preserve damage, loss, recovery, repair, write-off, reinstatement, and
   disposal as distinct auditable processes.
8. Support physical stock-taking without stopping ordinary stock operations.
9. Generate consistent scoped reports, exports, entity timelines, and audit
   output.
10. Give institute administrators enough configuration authority for
    departments, categories, roles, and users without allowing uncontrolled
    structural changes.

## 4. Success and Acceptance

V1 will be accepted when representative institutional users can complete the
agreed role-based workflows in staging and production without bypassing the
accepted controls.

Acceptance will be based on demonstrated behavior rather than unconfirmed
numeric improvement targets. At minimum:

- every active holding is catalogue-, quantity/unit-, custody-, and
  location-accounted;
- current stock and value reports reconcile with the underlying records;
- movements identify their source, destination or recipient, release, receipt,
  state, actor, and time;
- errors are corrected without deleting their history;
- role and approval separation prevents required self-approval;
- stock-take results preserve counts, recounts, investigations, adjustments,
  and immutable finalization;
- critical state, balance, financial, authority, and concurrency rules pass
  automated tests; and
- the agreed UAT scenarios pass after correction and retesting.

## 5. Product Principles

### 5.1 Append-only accountability

Persisted domain records must never be permanently deleted. Mistakes and later
changes use correction, reversal, supersession, replacement,
`ENTERED_IN_ERROR`, reinstatement, or archival while preserving actor, reason,
and time.

Mutable current-state views are allowed only when they are rebuildable from the
preserved source records.

### 5.2 Central Store intake

Ordinarily procured and delivered stock must physically enter through Central
Store. A Store Supervisor records it once before it can be allocated or moved
to a department. Departmental Stock Supervisors cannot create institutional
stock.

Opening stock already held around the institute is also recorded by a Store
Supervisor, who may travel to its location and capture it through the normal
active-intake workflow.

### 5.3 Separate facts that answer different questions

The product must not collapse:

- stock type and tracking method;
- catalogue definition and physical holding;
- institute ownership, organizational custody, current holder, and physical
  location;
- functional condition, physical damage, availability, and loss status;
- confirmed physical loss, financial write-off, and physical disposal; or
- repair completion, post-repair condition, and reinstatement after write-off.

### 5.4 Human-readable domain identifiers

Catalogue items, inventory units, stock-take exercises, and other important
business records receive permanent, system-generated, human-readable codes.
Internal database identifiers must not be the only way users recognize a
record.

### 5.5 Guided, mobile-first operation

Interfaces must use institution-friendly language, controlled choices, clear
states, and contextual guidance. The primary experience must work on modern
smartphone screens without requiring QR/barcode hardware or a laptop.

## 6. Users and Responsibilities

Roles define permitted actions; organizational scope defines where those
actions apply. One person uses one account even when assigned several roles.

| Actor | V1 responsibility |
| --- | --- |
| Master Admin | Creates people/accounts, organizational units, roles, scopes, assignments, and delegations. Receives no stock or Finance authority unless separately assigned the applicable business role. |
| Store Supervisor | Creates catalogue/intake stock, manages Central Store source release and allocation, proposes intake corrections, and records authorized physical disposal completion. |
| Stock Supervisor | Manages departmental stock operations, requests/receives/moves stock, reviews condition and damage, investigates discrepancies and loss, manages repairs, proposes write-off/reinstatement/disposal, and manages stock-take exercises. |
| Finance Supervisor | Records or approves stock valuation decisions, write-off, reinstatement, reconciliation financial effects, and financial authorization for sale, donation, and disposal. |
| Stock Taker | Performs assigned first counts, independent recounts, and condition observations without gaining wider operational approval authority. |
| Custodian/current holder/recipient | Holds responsibility or possession and confirms their actual participation without automatically receiving a full system account. |
| Repairer/assessor | Supplies attributable technical findings or repair outcomes. An authorized recorder may enter signed/referenced findings where the repairer has no account. |

Required independent participation is enforced at the person level. Assigning
another role or account must not allow the same person to propose and provide
an approval that must be independent.

## 7. V1 Functional Requirements

### FR-01 — People, accounts, roles, and scope

The system shall:

- create the first Master Admin during deployment;
- allow Master Admin to create one named account per person;
- generate an undisclosed strong temporary password for each interactive
  account and persist only its hash;
- let each account holder replace that temporary credential with their chosen
  8–25 character password through a short-lived, single-use link sent to their
  official email address;
- support login, logout, recovery/reset, suspension, revocation, and session
  invalidation;
- optionally enforce an agreed institutional email domain;
- support reusable, versioned permission roles scoped to the institute,
  department, or optional sub-department;
- support multiple role assignments on one account;
- support reasoned, exact-date, whole-role delegation with recipient
  acceptance and automatic authority expiry; and
- preserve submitted work when authority later changes without copying,
  impersonating, or replacing its original requester.

V1 shall not provide public registration, MFA, periodic password expiry,
permission-by-permission delegation, or a custom role-building interface for
ordinary departmental users.

### FR-02 — Organization, custody, possession, and location

The system shall:

- support `Institute → Department → optional Sub-department`;
- maintain a separate hierarchical physical-location structure;
- keep institute ownership, custodial organizational unit, current holder, and
  physical location as separate facts;
- allow people or organizational actors to be current holders without forcing
  every holder to have a login;
- require every active holding to have accounted custody and location, except
  through an explicit controlled unknown/pending process; and
- retain the history of every custody, holder, and location change.

### FR-03 — Catalogue, categories, units, and identifiers

The system shall:

- provide a user-managed catalogue covering all current and future stock
  categories;
- support a controlled category hierarchy of up to three user-facing levels;
- assign every catalogue item one primary category;
- create separate catalogue items when differences make stock materially
  non-interchangeable;
- assign every catalogue item one fixed/non-consumable or consumable stock
  type and one individual or quantity tracking method;
- assign one base unit per catalogue item;
- require whole quantities for countable units and permitted decimals for
  measured units;
- support controlled category-specific typed attributes at catalogue or
  inventory-unit scope;
- assign permanent catalogue and inventory-unit domain codes; and
- preserve institute asset-number and external-identifier correction history.

Manufacturer serial numbers are optional supporting identifiers and are not a
global search requirement. Inventory units remain independent; V1 has no
component, composite, installed-in, or parent-child inventory relationships.

### FR-04 — Central intake and opening capture

The system shall:

- allow only Store Supervisors to create active stock;
- support opening stock, new acquisition, donation/grant, external transfer,
  and explained `OTHER` provenance;
- create individually tracked units or quantity balances immediately after a
  valid intake;
- support atomic batch creation with retained form input after validation
  failure;
- reject the complete batch when any row duplicates a protected identifier;
- explicitly record initial functional condition and value or unknown value;
- record acquisition information at exact, month/year, year-only, or unknown
  precision;
- create each ordinary delivery first under Central Store accountability;
- allow later departmental allocation only through a controlled movement; and
- correct mistaken creation through a linked reversal proposed by one Store
  Supervisor and approved by another.

### FR-05 — Current stock and valuation

The system shall maintain current views for individually tracked units and
quantity balances showing, where applicable:

- catalogue item and category;
- inventory code and external identifiers;
- quantity and base unit;
- current custody, holder, and location;
- functional condition, damage, loss, and availability;
- acquisition and valuation information;
- current or pooled value;
- unvalued quantity or unit count; and
- unresolved actions and data-quality warnings.

KES values shall be stored as integer minor units. Unknown value is distinct
from zero. Quantity-held value shall use exact pooled total value with a moving
weighted-average display rate. Individually tracked units retain their own
valuation history. Monetary values are visible to users who may already view
the underlying stock record; value visibility does not grant authority to
perform a financial action. Values that would reveal an expected quantity
remain hidden during a blind stock count.

### FR-06 — Transfers, issues, movements, and receipt

Transfers, consumable issues, returns, possession handovers, and custody
transfers shall use:

```text
PENDING_RELEASE → IN_TRANSIT → COMPLETED
PENDING_RELEASE → CANCELLED
```

The system shall:

- reserve eligible stock while release is pending;
- allow permitted amendments only while enough unreserved stock remains;
- lock and revalidate quantity and state at release;
- require attributable source-release confirmation;
- require attributable destination or recipient receipt confirmation;
- keep partial receipt and discrepancies explicit;
- leave unresolved released stock in transit until resolved;
- create a destination balance for completed transfers;
- not create a destination balance for completed consumable issues; and
- prevent one person from satisfying independently required source and
  recipient participation.

Non-user recipients may participate through an expiring, single-use,
proposal-specific email challenge without gaining wider application access.
Where electronic confirmation is unavailable, only an authorized fallback
using attributable signed handover evidence may replace it.

### FR-07 — Returns and temporary loans

The system shall:

- record returns as new linked append-only transactions;
- require both the returning party and receiving custodian to confirm return;
- require an exact expected return date for every individual-unit loan;
- derive overdue status when the return date passes without completed return or
  reloan;
- allow the current holder to request a new exact return date;
- allow only the custodial authority to approve or reject that unchanged
  request;
- close the old loan as `RELOANED` and create a linked replacement loan after
  approval; and
- close a loan as `RETURNED` only after its linked return movement completes.

### FR-08 — Condition and damage

The controlled functional conditions are:

- `WORKING`;
- `PARTIALLY_WORKING`;
- `NOT_WORKING`; and
- `UNKNOWN`.

The system shall:

- require explicit initial condition;
- create later condition changes through attributable assessments;
- keep physical damage as a separate append-only case;
- require an interim use/quarantine disposition after damage reporting;
- allow quantity balances to be partitioned by condition without changing
  their total quantity;
- support several damage reports while preventing overlapping active repair
  allocations; and
- resolve damage quantities only through exact completed outcomes rather than
  a manual resolved switch.

### FR-09 — Missing stock, confirmed loss, and recovery

Current loss state shall follow:

```text
PRESENT → MISSING_UNDER_INVESTIGATION → CONFIRMED_LOST
```

Recovery from either missing or confirmed lost shall append a `RECOVERED`
event, close the case, and return current loss status to `PRESENT` without
erasing the loss history.

The system shall:

- restrict newly reported missing stock from ordinary movement or use;
- require a separately authorized person to confirm loss;
- keep condition, damage, quarantine, location, custody, movement, write-off,
  and disposal facts independent;
- require physical recipient confirmation and recovery inspection;
- support exact quantity partitions for quantity-tracked loss;
- explicitly resolve missing/lost stock discovered during transit; and
- permit validated late entry of an institutionally completed loss process
  while preserving actual and recording times.

### FR-10 — Repair and replacement

The repair lifecycle shall support:

```text
OPEN → IN_REPAIR → COMPLETED
OPEN → CANCELLED
```

Completed repairs shall record `SUCCESSFUL` or `UNSUCCESSFUL` outcomes,
reason/remarks, repairer, cost information where applicable, evidence, and a
separate post-repair condition assessment.

The system shall support quantity repair allocations whose complete outcomes
sum exactly to the repair quantity. A second opinion or new attempt creates a
new linked repair case. Replacement stock is always a new intake and never
inherits the old unit's condition, loss, write-off, disposal, or repair history.

### FR-11 — Write-off, reinstatement, and disposal

Confirmed physical loss shall not automatically write stock off. Physical
disposal shall not automatically follow from write-off.

Normal planned disposal shall require:

```text
operational proposal
→ Finance write-off/financial authorization
→ separate disposal authorization
→ Store records physical completion
```

Disposal shall use:

```text
PENDING_APPROVAL → APPROVED → COMPLETED
PENDING_APPROVAL → REJECTED
APPROVED → CANCELLED
```

Sale and outgoing donation are disposal methods, not sales or accounting
modules. Recovery of previously written-off stock requires a separate
Stock-proposed, Finance-approved reinstatement. Financial actions preserve
their external references, reasons, amounts, actors, times, and supporting
evidence without implementing payment or general-ledger processing.

### FR-12 — Physical stock-taking and reconciliation

Stock-take exercises shall use:

```text
DRAFT → ACTIVE → RECONCILING → READY_FOR_CLOSURE → CLOSED
```

The system shall:

- create a fixed, human-readable, explicitly scoped exercise and activation
  snapshot;
- allow ordinary stock operations to continue while counting;
- record exact physical count time and reconcile intervening transactions;
- provide partially blind first counts;
- make submitted counts immutable;
- require a different Stock Taker for discrepancy, mismatch, unexpected-item,
  and selected spot-check recounts;
- require a blind third count when the first two independent counts disagree;
- create investigations before changing stock records;
- use separately proposed and Finance-approved adjustments only for proven
  record errors;
- block finalization while mandatory work remains unresolved;
- require a different eligible Stock Supervisor to finalize;
- preserve an immutable closed snapshot and reproducible report;
- support controlled, independent overlapping exercises only through explicit
  authorization; and
- preserve cancelled, aborted, late, excluded, not-counted, unidentified, and
  post-closure findings without rewriting history.

### FR-13 — Search, reports, exports, and audit output

The system shall provide:

- permission-scoped global search by catalogue code, inventory-unit code,
  current/historical institute asset number, item name, and keywords;
- entity timelines;
- a permission-scoped global audit log;
- current-stock, finalized-stock-take, movement/accountability,
  condition/exception, and stock-finance report families;
- relevant fixed filters and explicit `as at`/generation information;
- PDF export for formal reports; and
- Excel export for tabular reports.

Finalized stock-take reports must reproduce their immutable closed snapshot.
V1 shall not include Word report export, custom report builders, scheduled
reports, arbitrary formulas, or advanced analytics.

### FR-14 — Notifications and escalation

The system shall provide:

- a persistent in-app notification inbox;
- direct authenticated SSE updates through AdonisJS Transmit;
- queued SMTP delivery for urgent, escalated, recovery, and non-user
  transactional messages;
- `INFORMATION`, `ACTION_REQUIRED`, and `URGENT` severities;
- safe action links that open and revalidate the live workflow;
- seeded reminders/escalations for missing stock, movement confirmation,
  discrepancies, loans, low stock, Finance decisions, delegation expiry, and
  stock-take work; and
- auditable delivery, failure, read, and business-resolution history.

Escalation may notify currently authorized people but must never grant
authority or change workflow state.

### FR-15 — Supporting documents

Authorized users shall be able to attach PDF and DOCX evidence to applicable
domain records.

The system shall:

- validate extension, MIME type, signature, and configured size limit;
- store evidence privately in Cloudflare R2;
- separate staging, production evidence, and backup storage namespaces;
- retain immutable attachment metadata and domain links in PostgreSQL;
- authorize every download against the underlying record scope;
- avoid permanent public evidence URLs; and
- mark mistakes as entered in error or superseded instead of silently
  overwriting or deleting them.

### FR-16 — Opening-data quality

Opening stock shall be manually captured by Store Supervisors rather than
migrated from a prior system. Historical reports support provenance but do not
create unobserved stock automatically.

The system shall provide a derived data-quality worklist for permitted
uncertainty such as unknown value/condition, placeholders, conflicting external
identifiers, unknown locations, or incomplete source references. Users resolve
the underlying domain fact; they cannot dismiss the warning as a substitute
for correction.

## 8. Non-functional Requirements

### NFR-01 — Deployment and scale

- One institute; no multitenancy.
- Approximately 100 named users and 20–50 concurrent users at initial scale.
- Publicly reachable, authenticated, online-only application.
- Separate staging and production VPS environments.
- Docker, Traefik, and Dokploy deployment.
- Initial production sizing target: approximately 8–12 GB RAM and 100 GB NVMe,
  subject to provider CPU and pre-production verification.

### NFR-02 — Security

- Named, non-shared application and server accounts.
- Key-only SSH, disabled remote root login, firewall, and no publicly exposed
  PostgreSQL, Redis, or worker ports.
- Password hashing, rate-limited login, controlled reset, session invalidation,
  scoped authorization, and person-level approval separation.
- Private R2 objects and least-privilege environment credentials.
- No public registration or V1 MFA.

### NFR-03 — Integrity and concurrency

- PostgreSQL and Lucid are the persistence boundary.
- Multi-write workflows use managed transactions.
- Current-state decisions use `FOR UPDATE` lock/read/revalidate/write behavior.
- Wider cross-process critical sections may use database-backed AdonisJS
  atomic locks without replacing the final transaction revalidation.
- Stable idempotency protects retries and queued work.
- Every persisted money value uses integer KES minor units.

### NFR-04 — Background work and live updates

- AdonisJS API and native database-backed queue worker run as separate
  services from one Docker image.
- Named queue workers handle email, escalation, scheduled expiry, and other
  failure-prone background work.
- Redis is used only as the Transmit cross-process message bus.
- Persistent PostgreSQL state remains authoritative when Redis or SSE is
  unavailable.

### NFR-05 — Backup and recovery

- Automated off-server Cloudflare R2 database backups.
- Daily backups retained 30 days.
- Weekly backups retained 12 weeks.
- Monthly backups retained 12 months.
- Quarterly restoration tests.
- Evidence storage retention remains separate from database backup retention.

### NFR-06 — Testing

- Japa test runner with its Japa/AdonisJS-native assertion and integration
  plugins.
- No initial Jest, `@japa/expect`, Chai, Mocha, or parallel test stack; another
  library requires a concrete unmet need and approval.
- Critical unit and PostgreSQL-backed functional tests written with features.
- Explicit allowed and rejected paths for stock, money, authority, state, and
  concurrency changes.
- Representative role-based UAT in staging before production acceptance.

### NFR-07 — Usability

- Responsive smartphone-first screens.
- Plain institutional language and predictable state labels.
- Accessible form controls, validation, feedback, and error recovery.
- Submitted forms retain correct data when another row or field fails.
- Area 14 guidance and onboarding are developed alongside the real interface
  and refined during UAT.

## 9. Technical Constraints

The accepted implementation uses:

- pnpm monorepo;
- AdonisJS API;
- SvelteKit with Svelte 5 and shadcn-svelte;
- AdonisJS Tuyau typed client;
- SvelteKit server loads/form actions as the ordinary browser-facing boundary;
- direct browser-to-AdonisJS Transmit SSE as the deliberate streaming
  exception;
- PostgreSQL with Lucid;
- AdonisJS native queues using the database adapter;
- database-backed AdonisJS locks;
- Redis for the Transmit bus only;
- Cloudflare R2 for evidence and off-server backups; and
- one built API image run separately as HTTP server and queue worker.

Local development shall use a Docker Compose pattern derived from the approved
MDP v2 reference, with PostgreSQL available for the application and pgAdmin 4
available for visual inspection of schemas, tables, constraints, and data.

## 10. V1 Exclusions

V1 does not include:

- procurement, supplier, quotation, purchase-order, invoice-payment, payroll,
  general-ledger, or full accounting workflows;
- a separate public/user registration flow;
- offline capture or synchronization;
- multitenancy;
- QR/barcode scanning, printing, or dedicated hardware;
- persistent component/composite relationships;
- manufacturer-serial-number search;
- automatic depreciation;
- native Android/iOS applications;
- custom report builders, scheduled reports, or advanced analytics;
- public evidence-document URLs;
- custom permission intersections such as category-at-location;
- permission-by-permission delegation;
- formal automated access-review campaigns;
- ongoing developer SRE/maintenance after the agreed delivery boundary; or
- new features not contained in the accepted design baseline.

## 11. Delivery and Operational Boundary

The contracted outcome is a working V1 that satisfies this PRD and its
authoritative design record, including implementation, critical automated
tests, UAT correction, production deployment, and handover.

The institute's ICT administrator will own routine server operations after
handover, including infrastructure health and backup checks using the supplied
runbooks.

The delivery obligation includes correcting reproducible defects that prevent
the accepted V1 requirements from working. It does not create an unlimited
maintenance or feature-change obligation.

After acceptance:

- new or changed requirements are separately scoped and priced;
- ongoing application maintenance and SRE work require a separate agreement;
- any retained developer server access requires that active support agreement;
  and
- infrastructure and third-party service charges remain the institute's
  responsibility.

## 12. Traceability

Detailed design coverage is organized as follows:

| PRD coverage | Design area |
| --- | --- |
| Inventory model, catalogue, units | Areas 1–2 |
| Custody, possession, location | Area 3 |
| Codes and identifiers | Area 4 |
| Intake and corrections | Area 5 |
| Movements, issues, returns, loans | Area 6 |
| Condition, damage, loss, repair, disposal | Area 7 |
| Valuation and financial boundaries | Area 8 |
| Stock-taking and reconciliation | Area 9 |
| Roles, permissions, approvals | Area 10 |
| Search, reports, audit, export | Area 11 |
| Notifications and escalation | Area 12 |
| Opening capture and data quality | Area 13 |
| Deployment, security, recovery, scale | Area 15 |
| Stack, storage, testing, delivery | Area 16 |
