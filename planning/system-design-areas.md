# Stock Management System — Planning Areas

This document is the canonical roadmap for the system-design discovery process.
It defines the planning areas, their boundaries, and current progress.

The area numbers in this document are stable. A change to the roadmap must be
made here and called out explicitly during the planning session.

Design decisions are referenced by area and local decision number, for example
`Area 3 / DEC-005`. Accepted decisions are recorded in `system-design.md`.
Questions requiring institute confirmation are recorded in
`decisions-to-be-confirmed.md`.

## Discovery Session Rules

- Keep questions concise and show the current question count.
- Give enough context, examples, and consequences for the question to be
  answered without requiring a second explanation.
- Combine tightly related decisions into one question group when they share the
  same data or business rule.
- Stop at the agreed question limit unless an extension is explicitly approved.
- Before discussing edge cases, present them together as a short list.
- Discuss only the edge cases the user selects or approves.
- Do not turn consequences of an accepted pattern into new questions unless
  they introduce a genuine business decision.

## Progress

| Area | Name                                           | Status      |
| ---- | ---------------------------------------------- | ----------- |
| 1    | Inventory Definitions and Model                | Completed   |
| 2    | Tracking Method Rules                          | Completed   |
| 3    | Organization, Locations, and Custody           | Completed   |
| 4    | Item Identification and Codes                  | Completed   |
| 5    | Inventory Intake and Receiving                 | Completed   |
| 6    | Issues, Returns, Movements, and Transfers      | Completed   |
| 7    | Condition, Damage, Loss, Repair, and Disposal  | Completed   |
| 8    | Valuation and Financial Information            | Completed   |
| 9    | Physical Stock-Taking and Reconciliation       | Completed   |
| 10   | People, Roles, Permissions, and Approvals      | Completed   |
| 11   | Reporting, Search, Audit Output, and Exporting | Completed   |
| 12   | Notifications and Automation                   | Completed   |
| 13   | Initial Data Capture and Data Quality          | Completed   |
| 14   | Usability and User Guidance                    | Deferred**  |
| 15   | Non-functional and Deployment Requirements     | Completed   |
| 16   | Technical Design and Architecture              | Completed   |

`Completed` means the current design discussion for that area is sufficiently
defined to continue. Institute-specific validations may still remain in
`decisions-to-be-confirmed.md`.

`**` Area 14 is deliberately deferred to implementation and testing. Workflow
guidance, onboarding material, and terminology will be developed alongside the
actual interfaces, then refined through testing. Development ADRs and
production-facing development notes will preserve those decisions.

## Canonical Areas

### Area 1 — Inventory Definitions and Model

Covers:

- fixed/non-consumable and consumable stock types;
- catalogue items and inventory holdings;
- extensible item categories;
- catalogue-item granularity and interchangeability;
- base units and quantity precision;
- independent component tracking without attachment or composite relationships;
  and
- category-specific attributes.

### Area 2 — Tracking Method Rules

Covers:

- individual versus quantity tracking;
- one active tracking method per catalogue item;
- explicit tracking-method selection and guidance;
- controlled conversion between tracking methods; and
- the permanent domain identifier for individually tracked units.

### Area 3 — Organization, Locations, and Custody

Covers:

- institutional ownership;
- custodial organizational units;
- current holders, who may be people or organizational units;
- physical locations;
- organizational and location hierarchies;
- location- and custody-accounted holdings;
- chain of possession;
- handover confirmation; and
- non-user holder or receiving-officer participation.

### Area 4 — Item Identification and Codes

Covers:

- institute asset numbers and tags;
- manufacturer serial numbers;
- catalogue or stock codes;
- uniqueness and reuse rules;
- handling missing, duplicate, or ranged historical identifiers.

Categories belong to Area 1. The permanent system-owned domain inventory
identifier belongs to Area 2. Area 4 builds on those decisions rather than
reopening them.

Barcode, QR, scanner, label-printer, and physical-labelling capabilities are
outside the current scope.

### Area 5 — Inventory Intake and Receiving

Covers:

- manual creation of incoming stock;
- entry validation;
- initial location, custodial organizational unit, and current holder where
  applicable;
- supporting source documents;
- corrections and reversals; and
- the boundary between procurement and stock management.

Purchasing is outside the system's domain. This area begins where stock is
manually created in the inventory system.

### Area 6 — Issues, Returns, Movements, and Transfers

Covers:

- issuing consumables;
- possession handovers and returns for fixed items;
- temporary possession loans and expected-return policy;
- physical-location movements;
- custodial-organizational-unit transfers;
- partial quantity movements;
- pending and in-transit states; and
- transaction cancellation, rejection, and reversal.

### Area 7 — Condition, Damage, Loss, Repair, and Disposal

Covers:

- condition definitions and inspection history;
- damage and loss reporting;
- repair and maintenance status;
- replacement of damaged, lost, or faulty inventory;
- disposal and write-off;
- evidence and approvals; and
- effects on availability and valuation.

### Area 8 — Valuation and Financial Information

Covers:

- value captured at intake;
- unit and total value;
- whether acquisition dates serve a confirmed valuation or reporting purpose;
- acquisition-date precision, only if that information is required;
- current versus historical value;
- valuation methods;
- depreciation or approximate value, if required;
- value changes and corrections; and
- financial reporting boundaries.

### Area 9 — Physical Stock-Taking and Reconciliation

Covers:

- creating and scoping a stock-take exercise;
- count sheets or manual count-entry workflows;
- independent counters and sign-off;
- expected versus observed quantities;
- condition and location verification;
- discrepancies and investigation;
- approved adjustments; and
- historical stock-take comparisons.

### Area 10 — People, Roles, Permissions, and Approvals

Covers:

- system roles;
- permission scopes;
- inventory administrators and holders;
- segregation of duties;
- approval routing;
- delegation and staff changes;
- access reviews; and
- authentication-related policy.

### Area 11 — Reporting, Search, Audit Output, and Exporting

Covers:

- operational and management reports;
- report filters and organizational roll-ups;
- stock history and movement reports;
- audit trails and evidence packages;
- saved report definitions;
- PDF, spreadsheet, or other exports; and
- reproducing or improving the supplied stock-take report.

### Area 12 — Notifications and Automation

Covers:

- pending handover and approval reminders;
- low-stock notifications;
- unresolved discrepancy alerts;
- overdue allocation or unknown-location alerts;
- upcoming and overdue possession-loan return reminders;
- notification channels; and
- escalation rules.

### Area 13 — Initial Data Capture and Data Quality

Covers:

- manually capturing opening inventory from physical stock and historical
  reports;
- duplicate detection;
- incomplete and conflicting records;
- temporary placeholders;
- review queues;
- source traceability; and
- opening-data acceptance and reconciliation.

### Area 14 — Usability and User Guidance

Covers:

- workflows for nontechnical users;
- progressive data entry;
- system recommendations and explanations;
- terminology and help text;
- error prevention;
- accessibility;
- mobile or scanning experience; and
- training and onboarding.

### Area 15 — Non-functional and Deployment Requirements

Covers:

- expected usage and performance;
- security and privacy;
- backup and recovery;
- availability;
- audit-log retention;
- online or offline operation;
- hosting and deployment;
- integrations; and
- operational support.

### Area 16 — Technical Design and Architecture

Covers:

- confirmed implementation stack;
- domain and data model;
- application boundaries;
- APIs and integrations;
- background processing;
- authentication architecture;
- document and attachment storage;
- testing strategy; and
- delivery phases.

## Mapping from the Original Nine-Area Outline

 The
current roadmap expands them as follows:

| Original area               | Current areas           |
| --------------------------- | ----------------------- |
| Business & Inventory Model  | Areas 1, 2, and 4       |
| Organization Structure      | Area 3                  |
| Inventory Operations        | Areas 5, 6, and 7       |
| Stock Tracking Rules        | Areas 1, 2, 4, 8, and 9 |
| People & Permissions        | Areas 3 and 10          |
| Reporting                   | Areas 9 and 11          |
| Notifications & Automation  | Area 12                 |
| Non-functional Requirements | Areas 13, 14, and 15    |
| Technical Design            | Area 16                 |

Some foundational decisions necessarily affect later areas. When that happens,
the later area should reference the accepted decision using a `Builds on`
entry rather than silently changing it.
