# Decisions to Be Confirmed

This document contains unresolved decisions that require confirmation from the
institute. Each entry is phrased as a question so it can be used directly
during continuing requirements discovery.

When a question is answered, its resulting decision should be recorded in
`system-design.md` and the question marked as confirmed or removed from this
list.

**Current status (27 July 2026):** the institute has answered all questions
required to begin the accepted V1 build. The question inventory below is
retained as a discovery checklist and historical reference; the accepted
answers in `system-design.md` are authoritative. New questions discovered
during implementation shall be added explicitly rather than inferred.

## System-Wide Audit Integrity

1. Does the institute agree that persisted stock-management domain records and
   their audit history must never be permanently deleted, and that errors or
   changes must instead use append-only corrections, replacement, reversal,
   `ENTERED_IN_ERROR`, or archival?

## Inventory Definitions and Classification

1. Does the institute agree with the following distinction?
   - A **fixed/non-consumable item** continues to exist after issue and may be
     assigned, transferred, inspected, damaged, lost, repaired, returned, or
     disposed of.
   - A **consumable item** reduces in available quantity when issued or used,
     and the same physical unit is not normally expected to be returned.

2. Does the institute have any policy, value threshold, item list, accounting
   rule, or exception that determines whether an item is fixed/non-consumable
   or consumable?

3. Does the institute agree that stock type and tracking method should be
   separate, so that:
   - some fixed/non-consumable items, such as computers and vehicles, can be
     tracked individually; and
   - other fixed/non-consumable items, such as identical chairs, can be tracked
     as quantities?

## Item Categories

1. Does the institute agree with a controlled category hierarchy that:
   - allows up to three category levels;
   - gives each item one primary category;
   - uses categories only to describe what an item is; and
   - permits the institute to begin with a flat list and add child categories
     only when needed?

2. Which staff members or positions should receive inventory administrator
   permission and therefore be allowed to create, rename, merge, or archive
   categories?

## Catalogue and Inventory Records

1. Does the institute agree that a catalogue item should define what an item is,
   while separate inventory records represent each individually tracked unit or
   quantity held in a department or location?

2. Does the institute agree that a catalogue item should represent an
   interchangeable kind of item, with separate catalogue items where brand,
   model, specification, compatibility, purpose, procurement, replacement, or
   reporting differences are materially important?

3. Does the institute have any additional rule for deciding when product
   differences are important enough to require separate catalogue items?

## Units of Measure

1. Does the institute agree that every catalogue item should have one base unit
   and that all incoming quantities, balances, and movements must use that unit?

2. Should packaging information be retained only for reference, without using
   it to calculate stock balances?

3. Does the institute agree that countable units must use whole numbers while
   measured units may use decimals?

4. How many decimal places are required for measured quantities such as litres,
   kilograms, and metres?

## Independent Inventory Components

1. Does the institute agree that CPUs, monitors, keyboards, mice, and other
   components remain completely independent inventory units without attachment,
   composite, installed-in, or used-with relationships?

2. Does the institute agree that selecting independent units in one batch
   operation provides convenience only and does not create a persistent
   relationship?


## Category-Specific Attributes

1. Does the institute need authorized inventory administrators to define
   structured fields for particular categories, such as `Chassis number` for
   vehicles or `RAM` for computers?

2. Which staff members or positions should be allowed to create, change, or
   archive these attribute definitions?

3. Does the institute agree that each attribute should be explicitly defined as
   either:
   - catalogue-level, with one value shared by all matching holdings; or
   - inventory-unit-level, with a separate value for each physical unit?

4. Does the institute agree that changing an attribute's scope after values
   exist must use an authorized, auditable migration rather than a normal edit?

## Tracking Method

1. Does the institute agree that each catalogue item must use exactly one active
   tracking method, either individual or quantity tracking?

2. If a tracking method must change after stock exists, who may authorize the
   conversion and what evidence or approval is required?

3. Does the institute agree that an authorized user must explicitly select and
   confirm the tracking method before stock is entered, while the system may
   provide a non-binding recommendation and explanation?

4. Does the institute agree that every individually tracked unit must receive a
   permanent, system-generated inventory identifier that is separate from its
   institute asset number and manufacturer serial number?

5. Does the institute agree that the identifier should be visible and
   human-readable?

6. What human-readable identifier format should the institute use?

## Organization, Locations, and Custody

1. Does the institute agree that institutional ownership, custodial
   organizational unit, current holder, and physical location are separate
   concepts?

2. Does the institute agree that every active individually tracked unit has one
   current holder, which may be a person or organizational unit?

3. Which people or organizational units may be recorded as current holders?

4. Does the institute agree that a current holder or organizational receiving
   officer need not have a system login and that audit history must separately
   identify the holder, confirming person, and logged-in user who processed a
   transaction?

5. Which possession handovers, custodial-unit transfers, and location movements
   require source release, destination receipt, independent approval, or
   additional evidence?

6. May a non-user recipient confirm a handover using a transaction-specific,
   single-use challenge sent to their verified email address?

7. Does the institute agree with the following confirmation order?
   - direct recipient confirmation through a no-login link;
   - a one-time code entered by an authorized receiving officer as a fallback;
     and
   - a numbered, signed handover record when verified email is unavailable?

8. What fallback evidence and authorization are required when the recipient
   cannot use email?

9. What is the institute's current custodial-organizational hierarchy?

10. Does the institute agree that organizational restructuring must preserve
    effective-dated historical relationships for previous reports and audits?

11. What is the institute's current physical-location hierarchy?

12. Which stores or operational areas require room-, shelf-, or bin-level
    location detail?

13. Does the institute agree that reorganizing physical locations must preserve
    effective-dated history for previous movements, reports, and audits?

14. Does the institute agree that every active inventory holding must have a
    current physical location or an explicit temporary exception state?

15. Under what circumstances may `location unknown` be used, who may authorize
    it, and how quickly must it be investigated?

16. Does the institute agree that every active inventory holding must have one
    custodial organizational unit, independently of its current holder and
    physical location?

17. Who may place newly ingested inventory in `pending allocation`, and within
    what time must a custodial organizational unit be assigned?

18. Does the institute agree that a possession handover changes the current
    holder without changing the custodial organizational unit, unless a custody
    transfer is also explicitly selected?

19. Does the institute agree that an initial departmental assignment from
    store-held stock explicitly gives the destination organizational unit both
    custody accountability and possession?

## Item Identification and Codes

1. Does the institute agree that an institute asset number is optional when
   unavailable, but must identify one physical unit, be unique when supplied,
   and never be reused?

2. What asset-number format should be used for newly tagged inventory?

3. Which new individually tracked items are required to receive a physical
   institute asset tag?

4. How should duplicate, unreliable, missing, or ranged identity numbers in
   historical reports be resolved?

5. Does the institute agree that every catalogue item should receive a
   permanent, human-readable, system-generated catalogue code?

6. What catalogue-code format should the institute use?

7. Which categories or intake workflows require a manufacturer serial number?

8. Does the institute agree that serial numbers remain supporting identifiers
   for validation and duplicate review, but are not used as a user-facing search
   method?

9. Does the institute agree that permanent system-generated inventory and
   catalogue codes must not embed custodial organizational unit, current holder,
   physical location, category, condition, status, or acquisition year?

10. Who may correct or replace an institute asset number or manufacturer serial
    number, and what evidence is required?

11. Does the institute agree that every identifier correction must retain the
    previous value, new value, reason, actor, and time as audit history?

12. Does the institute agree that current and historical asset numbers may
    resolve an inventory unit, while the permanent system code remains the
    canonical route identifier?

## Inventory Intake and Receiving

1. Which roles may manually create active inventory?

2. Does the institute agree that successful manual creation immediately makes
   the stock active without a separate receiving-confirmation step?

3. Which supporting references or documents, if any, must be recorded when
   stock is created?

4. Does the institute need to create several individually tracked units or one
   quantity addition in a single manual creation action?

5. Does the institute agree that a batch must create completely or not at all,
   while the form retains entered values and identifies rows that need
   correction?

6. Does the institute agree that every stock-creation action must record a
   controlled source type?

7. Which source types require an external reference or supporting document
   under institute policy?

8. Does the institute agree that the automatic creator and system-recording time
   cannot be backdated or directly edited?

9. Does the institute agree that mistaken stock creation must be corrected
   through linked reversal or compensating transactions rather than deletion?

10. Which roles may perform or approve creation corrections, and what evidence
    is required?

## Issues, Returns, Movements, and Transfers

1. Does the institute agree that a transfer preserves institute-wide available
   stock at a destination balance, while a consumable issue removes stock from
   available inventory?

2. Which roles may initiate or complete transfers and consumable issues?

3. Which recipients, purposes, or reasons must be recorded for consumable
   issues?

4. Does the institute agree that one movement may explicitly change physical
   location, custodial organizational unit, and current holder together, while
   unselected dimensions remain unchanged?

5. Does the institute agree that submitted transfers reserve stock at the
   source, source release locks it in transit, and destination receipt makes it
   available at the destination?

6. Who may amend a pending transfer quantity, and which amendments require
   renewed approval?

7. Does the institute agree that an increase is accepted only when the exact
   source balance has enough available unreserved stock to cover the additional
   quantity?

8. Does the institute agree that the destination confirms actual receipt, with
   received inventory becoming available and any difference remaining as an
   explicit unresolved discrepancy?

9. Who may report or resolve receipt discrepancies, and which resolutions
   require approval or evidence?

10. Does the institute agree that returns are new transactions linked to their
    originals rather than edits or deletions of the original events?

11. Which roles may create or approve returns, and what reasons or evidence must
    be recorded?

12. Does the institute agree that all movement-like transactions use
    `PENDING_RELEASE`, `IN_TRANSIT`, `COMPLETED`, and pre-release `CANCELLED`,
    while receipt requirements and discrepancies are not separate lifecycle
    states?

13. Does the institute agree that consumable issues require source release and
    recipient receipt confirmation, but completed receipt creates no destination
    inventory balance?

14. Which consumable issues require prior approval, and how should self-issues
    or overdue recipient confirmations be handled?

15. Does the institute agree that independent inventory units move only through
    explicit selection and that batch movement creates no component or composite
    relationship?

16. Does the institute agree that every temporary possession loan requires an
    expected return date and is marked `RETURNED` only after the current holder
    confirms release, the custodial organizational unit confirms receipt, and
    the linked return movement is completed?

17. Does the institute agree that extending a loan requires a linked reloan
    transaction with a new expected return date, rather than editing the
    original expected return date?

18. Does the institute agree that the current holder requests a reloan, the
    custodial organizational unit may approve or reject but not edit the
    request, and an approved same-holder reloan does not use `IN_TRANSIT`?

19. Who should receive overdue-loan notifications, when should they begin, how
    often should they repeat, and when should they be escalated?

20. Does the institute agree that a reloan request must specify an exact
    proposed return date, represented as `YYYY-MM-DD`, which the custodial
    organizational unit approves or rejects without alteration?

## Condition, Damage, Loss, Repair, and Disposal

1. Does the institute agree that physical condition, operational availability,
   and loss status must be recorded as separate concepts rather than combined
   in one working-condition field?

2. Does the institute agree that functional condition and physical damage must
   be recorded separately, so stock may be working while damaged or not working
   without visible damage?

3. Does the institute agree that quantity-tracked stock must be partitioned by
   functional condition, with each append-only reclassification preserving the
   holding's total quantity?

4. Does the institute agree that `WORKING`, `PARTIALLY_WORKING`,
   `NOT_WORKING`, and `UNKNOWN` form the complete system-controlled functional
   condition set, while fault details and notes remain separate?

5. Does the institute agree that initial functional condition must be selected
   explicitly during stock creation, without an automatic `WORKING` default?

6. Does the institute agree that every damage report must explicitly select
   either `QUARANTINED` or `REMAINS_IN_USE`, without changing the stock's
   movement state or overriding other availability restrictions?

7. Does the institute agree that damage reports must be permanent append-only
   cases with `OPEN`, `RESOLVED`, or `ENTERED_IN_ERROR` states and explicit,
   auditable resolution events?

8. Does the institute agree that loss status follows `PRESENT` to
   `MISSING_UNDER_INVESTIGATION` to `CONFIRMED_LOST`, while recovery is an
   append-only event that returns current status to `PRESENT` without erasing
   the loss history?

9. Does the institute agree that an authorized missing-stock report immediately
   blocks new ordinary transactions without being treated as proof of permanent
   loss or wrongdoing?

10. Does the institute agree that quantity-tracked stock is partitioned by loss
    status through atomic, append-only reclassification while preserving the
    total accounted quantity?

11. Does the institute agree that `CONFIRMED_LOST` and write-off are separate
    decisions, and that recovery after write-off requires a separate authorized
    reinstatement before the stock becomes active again?

12. Does the institute agree that physical disposal and write-off are separate,
    linked transactions and that any outstanding mismatch between them must
    remain visible?

13. Does the institute agree that normal physical disposal requires a completed
    write-off and separate disposal authorization, with a controlled,
    evidence-backed exception for emergencies or previously completed disposal?

14. Does the institute agree that disposal follows `PENDING_APPROVAL` to
    `APPROVED_AWAITING_DISPOSAL` to `COMPLETED`, with terminal `REJECTED` and
    pre-disposal `CANCELLED` outcomes?

15. Does the institute agree that repair is a separate append-only process and
    does not silently change movement, custody, possession, location, functional
    condition, damage, or loss records?

16. Does the institute agree that a repair may originate from a damage report,
    functional fault, preventive maintenance, inspection finding, or explained
    other reason without requiring a false damage report?

17. Does the institute agree that `UNDER_REPAIR` begins only when repair
    actually starts, blocks ordinary transactions, and is removed after an
    explicit repair-ending assessment without overriding other restrictions?

18. Does the institute agree that repair follows `OPEN` to `IN_REPAIR` to
    `COMPLETED`, permits `CANCELLED` only before work starts, and records an
    immutable `SUCCESSFUL` or `UNSUCCESSFUL` completion outcome separately from
    functional condition?

19. Does the institute agree that an unsuccessful repair or second opinion must
    create a new linked repair case instead of reopening or changing the
    completed case?

20. Does the institute agree that quantity-tracked repairs may split their exact
    affected quantity between immutable `SUCCESSFUL` and `UNSUCCESSFUL`
    allocations, each with a post-repair functional condition, while all
    allocations must sum to the repair quantity?

21. Does the institute agree that replacement is distinct new stock with its own
    identity and history, connected to the replaced stock or incident only by a
    non-cascading historical `REPLACEMENT_FOR` link?

22. Does the institute agree that every functional-condition change requires an
    append-only assessment and that an assessment may also confirm an unchanged
    condition as stock-taking or audit evidence?

23. Does the institute agree that quantity-based damage is resolved through
    exact, non-overlapping outcome allocations and that only a completed,
    explicitly linked source transaction may resolve its selected quantity?

24. Does the institute agree that stock may have multiple open damage cases, one
    repair may explicitly address several of them, and simultaneous active
    repairs must not claim the same inventory unit or quantity allocation?

25. Does the institute agree that stock reported missing during transit remains
    `IN_TRANSIT` until recovered and received or explicitly resolved as
    confirmed lost, without creating unconfirmed destination stock?

26. Does the institute agree that recovered stock becomes `PRESENT` only after
    confirmation by the intended movement recipient or, outside a movement, an
    authorized custodial receiving officer, and then remains under
    `RECOVERY_HOLD` until required checks are completed?

27. Does the institute permit validated late entry of an offline-confirmed loss
    by atomically recording linked missing and confirmed-loss events with their
    actual dates, later system-recording time, reason, and supporting evidence?

## Valuation and Financial Information

1. Does the institute agree that intake valuation uses KES integer minor units,
   records a controlled valuation basis, treats total value as authoritative for
   quantity-tracked stock, stores value per individually tracked unit, and
   represents unknown value explicitly rather than as zero?

2. Does the institute agree that acquisition date, valuation-effective date,
   and system-recording time are separate; that acquisition date may have exact,
   month, year, or unknown precision; and that corrections and genuine
   revaluations create different append-only records?

3. Does the institute agree that the stock system is a valuation ledger rather
   than a full accounting system; that physical events do not automatically
   change value; that write-offs and restorations are separate append-only
   financial events; and that depreciation requires a separately approved
   institutional policy?

4. Does the institute agree that quantity-tracked stock uses an authoritative
   pooled quantity and KES value with a derived moving weighted-average rate;
   that transfers, issues, and returns carry linked proportional value
   allocations; and that deterministic minor-unit handling must prevent
   stranded value?

5. Does the institute agree that partially valued stock must show its known
   subtotal and unvalued quantity without presenting a complete average; that a
   value supplied later is a linked first-known valuation; that authorized
   backdated entries retain their actual recording audit trail; and that
   write-offs, restorations, and corrections use positive, bounded,
   append-only transactions?

6. Does the institute agree that individually tracked units retain separate
   authoritative valuations; that declared batch totals must reconcile exactly
   with their unit allocations; that mixed known and unknown unit values remain
   visible; and that quantity-tracked revaluation applies only to explicitly
   selected complete balances?

## Physical Stock-Taking and Reconciliation

1. Does the institute agree that a stock-take exercise has a fixed,
   append-only-amendable scope and activation snapshot; that routine stock
   operations continue during counting; and that exact count times and
   intervening transaction history determine the expected stock at each count?

2. Does the institute agree that first counts are partially blind; that
   quantity expectations remain hidden while exact expected identifiers may be
   shown for individually tracked stock; and that submitted observations are
   immutable and may only be corrected through linked recounts?

3. Does the institute agree that a different, blind second counter is required
   for discrepancies, unexpected units, location or condition mismatches, and
   selected spot-checks; and that reviewers may sign off completion but cannot
   alter submitted counts?

4. Does the institute agree that a confirmed discrepancy creates an
   investigation rather than changing stock directly; that observations and
   findings remain append-only; and that resolution is derived only after all
   linked corrective processes are completed?

5. Does the institute agree that reconciliation adjustments are separately
   proposed and approved, apply only to proven record errors, are atomically
   revalidated before application, and may not replace established stock
   creation, movement, loss, condition, or correction workflows?

6. Does the institute agree that a stock-take exercise may be finalized only
   after all scoped work and linked resolutions are complete; that finalization
   creates an immutable historical snapshot without affecting normal stock
   operations; and that later findings use linked follow-up records?

7. Does the institute agree that active-scope expectations follow transactions
   relative to each count time; that in-transit stock is shown separately; that
   conflicting counts require independent matching evidence; and that
   inaccessible or unidentified stock remains explicitly unverified rather
   than being assigned an assumed result?

8. Does the institute agree that non-overlapping stock-take exercises may run
   concurrently; that overlapping scopes are blocked by default but may receive
   explicit authorization; and that each exercise retains separate counts,
   progress, and resolutions?

9. Does the institute agree that late counts preserve both claimed and recorded
   times; that draft and activated exercises use `CANCELLED` and `ABORTED`
   respectively rather than deletion; and that post-finalization findings may
   produce linked follow-up and amended reports without changing the original
   finalized snapshot?

## People, Roles, Permissions, and Approvals

1. Does the institute agree that people, user accounts, organizational units,
   system actors, and scoped role assignments are separate; that holders and
   recipients do not require accounts; and that interactive accounts may not be
   shared?

2. Does the institute agree that stable application permissions are bundled
   into institute-configured roles; that access is denied by default; and that
   technical access administration, business authority, and responsibility for
   stock do not implicitly grant one another?

3. Does the institute agree that V1 role assignments are scoped by institution,
   organizational unit, or specific workflow assignment; that location and
   category remain filters rather than permission boundaries; that descendant
   inclusion is explicit; and that the system preserves the effective
   permission and resolved scope used for every historical action?

4. Does the institute agree that controlled approvals apply to exact proposal
   versions, cannot be self-satisfied or bypassed by wider authority, and remain
   action-specific; while routine intake, movement, loan, and damage-reporting
   workflows retain their previously agreed participation rules?

5. Does the institute agree that temporary delegation transfers one or more
   complete active role assignments; requires the recipient's acceptance, a
   reason, and mandatory exact dates; cannot include `MASTER_ADMIN` or be
   re-delegated by default; and expires during authorization checks even if
   queued expiry processing is delayed?

6. Does the institute agree that suspended or deactivated accounts immediately
   lose access without deleting history or transferring stock responsibility;
   that pending tasks are reassigned explicitly; and that V1 provides manual,
   auditable access oversight rather than formal review campaigns, inferred
   staff transfers, or automated disciplinary decisions?

7. Does the institute agree that named local accounts and secure, auditable
   recovery form the initial authentication boundary; that V1 uses
   system-generated 8–25 character passwords without MFA, forced first-login
   change, scheduled expiry, or separate self-verification for sensitive
   actions; and that non-user email challenges remain verified, short-lived,
   proposal-specific, and incapable of granting wider access?

8. Does the institute agree that deployment-created `MASTER_ADMIN` provisions
   access only; that reusable sibling `STOCK_SUPERVISOR` and
   `FINANCE_SUPERVISOR` roles handle physical inventory and stock-related
   financial authority respectively; that the same person uses one account
   even when assigned several roles; and that sale remains a disposal method
   rather than a separate sales or accounting module?

9. Does the institute agree that the Master Admin centrally maintains an
   institute → department → optional sub-department structure; that
   organizational units define where authority applies while reusable roles
   define what actions are permitted; and that departments request missing
   authority rather than creating their own roles?

10. Does the institute agree that a reusable `STORE_SUPERVISOR` role is the
    single institutional intake authority; that departmental Stock Supervisors
    cannot create stock; that direct departmental deliveries use manual
    delivery evidence followed by Store verification, system intake, and a
    linked movement; and that remotely stored excess remains under Central
    Store custody unless it is explicitly allocated to the department?

11. Does the institute agree that condition and missing reports may be recorded
    broadly but reviewed by a Stock Supervisor; that confirmed loss requires a
    different Stock Supervisor from the reporter, accountable holder, and
    investigator; that repair outcomes remain attributable to the actual
    repairer without requiring every repairer to have an account; that physical
    recipients confirm recovery; and that Stock proposes while Store records
    authorized physical disposal with method-appropriate evidence?

12. Does the institute agree that Stock Supervisors manage stock-take
    exercises, assigned Stock Takers submit immutable counts and independent
    recounts, Finance approves proven reconciliation adjustments, and a
    different Stock Supervisor performs finalization?

13. Does the institute agree that the stock system records referenced Finance
    decisions rather than reproducing valuation engagement, procurement,
    payment, or accounting processes; that repair expenditure and reinstatement
    after write-off remain separate; and that V1 preserves mandatory reasons
    and text references while also allowing PDF and DOCX supporting evidence?

14. Does the institute agree that `MASTER_ADMIN` is the audited V1 access root
    without another in-application approver; that all accounts are
    Master-created and unique per person; and that an official personal-email
    domain may be enforced when configured?

15. Does the institute agree that material role-permission changes create new
    versions; that authorization expiry is enforced during every action rather
    than relying on a scheduled job; and that pending work continues through
    append-only reassignment without replacing its original requester or
    reusing approvals after a material proposal change?

16. Does the institute agree that only a Store Supervisor may propose an intake
    correction or reversal; that a different Store Supervisor must approve or
    reject the exact proposal; and that the proposal, decision, reason, value
    effect, and resulting compensating events remain append-only?

## Reporting, Search, Audit Output, and Exporting

1. Does the institute agree that V1 global search uses catalogue codes,
   inventory-unit codes, current or historical institute asset numbers, and
   item-name keywords; while excluding serial-number, QR, and barcode search?

2. Does the institute agree that V1 provides fixed current-stock, finalized
   stock-take, movement/accountability, condition/exception, and stock-finance
   report families with relevant filters rather than a custom report builder?

3. Does the institute agree that entity timelines and a global audit log remain
   read-only, permission-scoped views of the append-only domain history?

4. Does the institute agree that V1 exports formal reports to PDF and tabular
   reports to Excel; that finalized stock-take reports reproduce their closed
   snapshots; and that custom, scheduled, saved, dashboard, and advanced-trend
   reporting is deferred?

5. Does the institute agree that every authenticated user may view monetary
   values for stock records already within their authorized scope; that value
   visibility grants no financial action authority; and that values which could
   reveal an expected quantity remain hidden during a blind count?

## Notifications and Automation

1. Does the institute agree that V1 uses a persistent in-app notification inbox
   with SSE for live updates and queued SMTP for urgent, escalated, recovery,
   and non-user transactional messages?

2. Does the institute agree that notifications use `INFORMATION`,
   `ACTION_REQUIRED`, and `URGENT`; that action buttons open the current
   authorized workflow rather than directly executing sensitive actions; and
   that reading a notification does not resolve its business task?

3. Does the institute agree to the seeded calendar-day escalation defaults for
   missing stock, movements, discrepancies, loans, low stock, allocation,
   Finance decisions, delegation expiry, and stock-take assignments, subject to
   adjustment after observing actual use?

4. Does the institute agree that escalation never changes authority or workflow
   state, normally sends once per level, routes through current scoped business
   roles, and alerts Master Admin only for access/security matters or when no
   eligible business recipient exists?

## Initial Data Capture and Data Quality

1. Does the institute agree that Store Supervisors capture opening stock
   through the normal active intake workflow, including by travelling to
   departments or other locations; that historical reports are supporting
   references rather than authority to create unobserved stock; and that
   independent verification occurs through the normal stock-taking process?

2. Does the institute agree that V1 presents one data-quality worklist derived
   from unresolved inventory facts; that users must correct the applicable
   underlying record rather than dismiss the warning; and that permitted
   uncertainty does not weaken hard uniqueness or intake validation rules?

## Non-functional and Deployment Requirements

1. Does the institute agree to one publicly reachable, single-institution,
   online-only deployment with separate staging and production VPS
   environments and no public account registration?

2. Does the institute agree to named, key-only production administration,
   institute ownership of infrastructure credentials, removal of unused
   developer access after stabilization, and system-generated 8–25 character
   password authentication without application MFA, forced first-login change,
   or scheduled expiry in V1?

3. Does the institute agree to off-server R2 backups with the proposed
   daily/weekly/monthly rolling retention, quarterly restoration tests, and a
   separate later decision for long-term queryable record and evidence
   retention?

4. Does the institute agree to the initial planning envelope of approximately
   100 named and 20–50 concurrent users, the proposed VPS range, mandatory
   baseline health and backup visibility at handover, institute-operated
   routine checks, and separately contracted post-acceptance SRE or ongoing
   support?

## Technical Design and Architecture

1. Does the implementation use a pnpm monorepo with SvelteKit as the ordinary
   browser-facing BFF, a server-only Tuyau client, AdonisJS as the business
   authority, and a deliberate direct browser connection to authenticated
   Transmit SSE routes?

2. Does production run the AdonisJS HTTP server and native database-backed queue
   worker as separate Dokploy services from the same Docker image, with the
   worker command explicitly naming every active queue?

3. Is Redis limited in V1 to Transmit's cross-process bus between notification-
   producing workers and the HTTP process that owns SSE connections, while
   persistent notifications and queue state remain in PostgreSQL?

4. Do atomic domain changes use managed Lucid transactions, `FOR UPDATE`
   read-and-revalidation where current state matters, and database-backed
   AdonisJS atomic locks only for the wider cross-process critical sections
   that require them?

5. Does V1 store private supporting evidence in Cloudflare R2, accept PDF and
   DOCX only, retain immutable attachment metadata in PostgreSQL, and preserve
   mistaken or superseded attachments through the append-only audit pattern?

6. Does V1 begin with Japa and its Japa/AdonisJS-native plugins only, introduce
   no Jest, `@japa/expect`, Chai, Mocha, or parallel stack without a concrete
   approved need, and follow critical-domain testing with representative
   role-based user acceptance testing in staging?

7. Is 31 October 2026 the production target for the accepted online-only V1,
   with critical tests, documentation, UAT, deployment, and handover included
   in the delivery milestones?
