# Stock Management System — Design Record

This document captures requirements, terminology, design decisions, and unresolved
questions as the system is planned. Accepted decisions should be treated as the
current reference unless later evidence requires an explicit revision.

The canonical planning sequence and current progress are maintained in
[`system-design-areas.md`](system-design-areas.md).

## Decision Statuses

- **Accepted:** Use as a design rule.
- **Provisional:** Safe to work with, but still requires confirmation.
- **Open:** No decision has been made.
- **Superseded:** Replaced by a later recorded decision.

## System-Wide Invariants

### SYS-001: Never delete persisted domain records

- **Status:** Accepted
- **Scope:** All planning areas, including previously accepted and future
  decisions

The system shall not provide a normal operation that permanently deletes a
persisted stock-management domain record or its audit history.

Errors and changed facts shall be handled through the applicable append-only
pattern, including:

- a correcting or superseding record;
- an end-dated record followed by a replacement;
- a linked reversal or compensating transaction;
- an `ENTERED_IN_ERROR` outcome; or
- archival when a definition is no longer available for new use.

The original record, correction reason, actor, and system-recording time shall
remain retrievable in the audit history. Current operational views may exclude
archived, superseded, reversed, or entered-in-error records by default, but
shall not destroy them.

Mutable query projections may be maintained for performance only when they can
be rebuilt and explained from the preserved authoritative history.

This invariant applies retrospectively to every previously accepted design
decision and shall be inherited by future decisions without requiring the
no-deletion question to be repeated.

#### Reason

Preserving the original fact and its correction establishes accountability and
prevents errors, abuse, or inconvenient events from being concealed. A
consistent rule also avoids each workflow inventing a different correction
mechanism.

## Design Decisions

### Area 1 — Inventory Definitions and Model

#### DEC-001: Separate stock type from tracking method

- **Status:** Accepted
- **Area:** Inventory definitions and classification

The system shall represent **stock type** and **tracking method** as separate
properties.

##### Stock type

- **Fixed/non-consumable:** The physical item continues to exist after being
  issued. It may be assigned, transferred, inspected, damaged, lost, repaired,
  returned, or disposed of.
- **Consumable:** Issuing or using the item reduces the available quantity, and
  the same physical unit is not normally expected to be returned.

##### Tracking method

- **Individually tracked:** Each physical unit has its own identity and history.
  Manufacturer serial numbers and institute asset numbers may be recorded when
  applicable.
- **Quantity tracked:** Interchangeable units are managed as quantities rather
  than as separately identified physical records.

##### Reason

The institute currently describes its stock as either fixed or consumable.
However, this classification does not determine whether every physical unit
needs its own record. For example, a computer may need an individual identity
and movement history, while multiple identical chairs may be managed as a
quantity. Keeping these concepts separate avoids forcing all fixed stock into
individual tracking.

##### Current examples

These examples are working interpretations, not a complete classification:

| Item                                   | Likely stock type    | Likely tracking method |
| -------------------------------------- | -------------------- | ---------------------- |
| Computer or vehicle                    | Fixed/non-consumable | Individually tracked   |
| Identical chairs                       | Fixed/non-consumable | Quantity tracked       |
| Printing paper, toner, or stapler pins | Consumable           | Quantity tracked       |

##### Validation still required

The administration has not yet provided its formal rule for distinguishing
fixed stock from consumables. The definitions and examples above must therefore
be presented for confirmation during continuing requirements discovery.

#### DEC-002: Cover all reported inventory types

- **Status:** Accepted
- **Area:** Inventory scope

The system shall support all inventory types represented in the existing
stock-take report, including:

- Vehicles
- Furniture
- Office equipment and other fixed/non-consumable items
- Expendable and consumable goods

This is a system capability decision, not a requirement that every report
contain every inventory type.

Reports shall allow the user to select the inventory scope needed for a
particular report. Depending on the report definition, this may include all
inventory or a selected subset such as stock type, tracking method, item
category, department, or location. The exact filters will be decided during
reporting discovery.

##### Reason

The existing report covers materially different inventory types. Supporting
them within one inventory foundation allows the institute to produce a complete
report when needed without preventing narrower operational reports.

#### DEC-003: Use an extensible, user-managed item catalogue

- **Status:** Accepted
- **Area:** Inventory definitions and classification

The existing stock-take report is an incomplete blueprint of the institute's
inventory, not an exhaustive definition of what the system may hold.

The system shall:

- support inventory categories that do not appear in the existing report;
- allow authorized institute users to create and maintain item categories;
- avoid hard-coding the current list of categories into the application; and
- allow new items and categories to be introduced without a software change.

Potential future inventory includes workshop materials, laboratory supplies,
tools, ICT stores, library items, fuel, cleaning supplies, and other items that
neither the report nor the current users foresee.

Every inventory item shall still use the broad stock-type classification from
Area 1 / DEC-001:

- fixed/non-consumable; or
- consumable.

User-managed categories provide more specific organization beneath that stable
classification. A category does not replace an item's stock type or tracking
method.

##### Reason

The institute's inventory and operational needs will evolve. A closed list
derived from one historical report would make ordinary inventory changes
dependent on application development. Stable stock behaviour can be represented
by stock type and tracking method, while categories remain flexible.

#### DEC-004: Use a controlled category hierarchy

- **Status:** Accepted
- **Area:** Inventory definitions and classification

Item categories shall support a parent-and-child hierarchy subject to the
following rules:

1. The hierarchy shall have a maximum of three levels.
2. An item shall have one primary category.
3. A category shall describe **what an item is**. It shall not represent its
   custodial organizational unit, current holder, physical location, condition,
   stock type, or tracking method.
4. Ordinary inventory users may select existing categories, but only authorized
   inventory administrators may create, rename, merge, or archive categories.
5. Each category shall have a name and a short description explaining what
   belongs in it. Examples may be included in that description; V1 shall not
   add a separate category-examples field.
6. Category creation shall check for similar existing categories and warn about
   likely duplicates.
7. A category that has been used shall not be permanently deleted. It may be
   archived or merged while preserving historical records.
8. Child categories are optional. The institute may begin with a flat category
   list and introduce deeper classification only when it improves operations or
   reporting.
9. The system shall identify uncategorized items for review rather than rely on
   a permanent catch-all `Other` category.

Within V1, normalized active category names shall be unique among siblings;
the same name may appear beneath different parents when the resulting paths
represent different classifications. Categories support create, rename,
reparent, archive, restore, and controlled merge, but never permanent deletion.
Archived categories remain visible on existing records and are excluded from
new catalogue-item selection.

Merge is a controlled migration rather than an ordinary edit. It shall preview
affected catalogue items and attribute conflicts, reject self-merge, cycles,
and archived targets, atomically reclassify affected current catalogue items,
record their change history, archive the source category, record its merge
target, and preserve the source's history. Attribute conflicts shall require an
explicit resolution and shall never be silently discarded or coerced.

Examples of valid hierarchies include:

- `ICT Equipment > Computers > Laptops`
- `Furniture > Chairs > Executive Chairs`
- `Workshop Equipment > Hand Tools`

##### Reason

A hierarchy provides room for more precise search and reporting as the
inventory grows. The controls above reduce duplicate categories, inconsistent
levels, and the accidental mixing of unrelated concepts such as item type and
location.

#### DEC-005: Separate catalogue items from inventory holdings

- **Status:** Accepted
- **Area:** Inventory model

The system shall distinguish between:

- a **catalogue item**, which defines what an item is; and
- an **inventory holding**, which records the actual individually tracked unit
  or quantity held by the institute.

A catalogue item shall hold shared descriptive and behavioural information,
including its permanent code, required name, optional description, optional
search keywords, primary category, stock type, tracking method, base unit, and
applicable catalogue-scoped attribute values.

The catalogue shall use one optional description rather than a second general
specifications field. Its interface guidance shall invite shared brand, model,
specification, compatibility, size, RAM, storage, purpose, or other
distinguishing detail. It shall also explain that serial number, condition,
location, custody, holder, and other facts belonging to one physical unit must
not be entered there.

One catalogue item may be referenced by multiple inventory holdings:

- For individually tracked stock, each physical unit shall have its own
  inventory record and may have an institute identity number, manufacturer
  serial number, condition, custodial organizational unit, current holder,
  physical location, and lifecycle history.
- For quantity-tracked stock, balances of the same catalogue item may be held
  in multiple departments or locations without creating duplicate catalogue
  definitions.

Example:

- Catalogue item: `HP ProBook 450 G8 Laptop`
- Inventory unit: institute identity `MATTI/ICT/LAP/001`, manufacturer serial
  `ABC123`, held by the ICT department

##### Reason

Descriptions in the historical report are repeated and sometimes combine item
details with serial numbers, custodial accountability, and possession
information. Separating the shared item definition from actual holdings reduces
duplication while allowing each unit or balance to retain its own location and
history.

#### DEC-006: Define catalogue items by interchangeability

- **Status:** Accepted
- **Area:** Inventory model

A catalogue item shall represent a particular interchangeable kind of item, not
merely a broad generic label.

Items shall use separate catalogue definitions when differences in brand,
model, specification, compatibility, purpose, procurement, replacement, or
reporting are materially important. Differences that do not affect how the
institute treats the item do not require separate catalogue definitions.

Examples:

- `HP ProBook 450 G8` and `Lenovo ThinkPad T14` are separate catalogue items
  when their model or specification matters.
- Multiple identical HP ProBook units share one catalogue item; each physical
  unit retains its own institute identity number, serial number, condition,
  custodial organizational unit, current holder, and physical location.
- Incompatible toner models are separate catalogue items.
- Brands of A4 80gsm paper may share one catalogue item if the institute treats
  them as interchangeable.

When an imported historical record lacks enough detail, a clearly marked
placeholder catalogue item such as `Laptop — model unknown` may be used. It
shall remain identifiable for later data review and correction.

Before inventory holdings exist, classification fields may be corrected through
a reasoned, versioned change. After holdings exist, stock type, tracking method,
and base unit shall not be changed through ordinary catalogue editing; their
controlled correction or conversion workflows must preserve existing stock
semantics and history. The permanent code is never editable. Compatible name,
description, keyword, category, and catalogue-attribute corrections remain
versioned. Archiving a catalogue item prevents new intake without hiding or
disabling its existing holdings.

Before creating a catalogue item, the system shall show non-blocking similar
active candidates using normalized name, keyword, category, prefix, or
substring matching. Creation may continue only after explicit confirmation
that the proposed definition is not interchangeable with those candidates.
V1 shall not add a separate search dependency or PostgreSQL search extension
for this guidance.

Current catalogue-item names shall be normalized and unique across the
institution, including archived definitions. Archiving an item shall not make
its current name available for a second definition. An exact normalized-name
duplicate is therefore a hard conflict; the non-blocking rule above applies to
similar but non-identical names that may still describe different
interchangeable definitions. A materially different item shall use a name that
identifies the meaningful difference. Similarity confirmation shall include a
reason and shall be repeated if concurrent catalogue changes make the reviewed
candidate set stale.

Historical records that cannot yet be identified precisely shall use an
explicit `PLACEHOLDER` identification status rather than relying only on words
such as `unknown` in the name. Correctly identified definitions use
`CONFIRMED`. Changing this status is a reasoned, versioned catalogue correction,
and the data-quality worklist shall derive unresolved placeholder work directly
from the current status.

##### Reason

Storing shared product information once avoids repeating brand, model, and
specification on every physical unit. The interchangeability rule also prevents
materially different products from being combined solely because they belong to
the same category.

#### DEC-007: Maintain stock in one base unit per catalogue item

- **Status:** Accepted
- **Area:** Inventory quantities

Each catalogue item shall have one base unit of measure. Incoming records must
provide the quantity expressed in that base unit. Packaging information may be
retained for reference, but it shall not control the stock balance.

All balances and inventory movements, including receipts, issues, transfers,
losses, and stock-take adjustments, shall use the catalogue item's base unit.

Examples:

| Catalogue item    | Base unit |
| ----------------- | --------- |
| A4 printing paper | Ream      |
| Diesel            | Litre     |
| Electrical cable  | Metre     |
| Stapler pins      | Box       |
| Plastic chair     | Piece     |

This rule applies to quantity-tracked fixed/non-consumable items as well as
consumables. Individually tracked items normally use `item` or `piece` and do
not require quantity conversion.

##### Packaging

Packaging units such as cartons may vary between suppliers or deliveries. If
one carton contains five reams, the incoming record shall add five reams. If a
later carton contains six reams, that record shall add six reams. The system
shall not infer a universal `carton-to-ream` conversion.

The system may retain source packaging information, such as `one carton`, for
reference or audit purposes. The supplied base-unit quantity remains
authoritative for stock calculations.

##### Measurement conversion

Stable mathematical conversions, such as kilograms to grams or litres to
millilitres, are distinct from variable packaging conversions. Input tooling may
assist with stable conversions, but inventory shall still be normalized to and
stored in the catalogue item's base unit.

##### Domain boundary

Purchasing is outside the stock management system's domain. The external source
or the stock-ingestion process is responsible for supplying the actual quantity
in the catalogue item's base unit.

##### Reason

Using one authoritative unit prevents stock balances from changing meaning when
supplier packaging changes. It also keeps inventory calculations independent
of purchasing and packaging conventions.

#### DEC-008: Validate quantity precision by unit type

- **Status:** Accepted
- **Area:** Inventory quantities

Quantity validation shall depend on the catalogue item's base unit:

- **Countable units** such as `piece`, `ream`, or `box` shall accept whole
  numbers only.
- **Measured units** such as `litre`, `kilogram`, or `metre` shall accept
  decimal quantities.

If the institute needs to track part of a countable package, the catalogue item
should normally use the package contents as its base unit. For example, if
individual units are issued from a box, the base unit should be the individual
unit rather than permitting a balance of `0.5 box`.

Base units shall be institution-wide, user-managed definitions containing a
name, symbol, kind, and precision. Countable units shall have precision zero.
Measured units shall select a precision from one to three decimal places and
shall default to three. V1 shall not define packaging or measurement-conversion
tables. A unit's kind and precision shall be immutable after use, and a used
unit shall be archived rather than deleted.

##### Reason

Fractional physical counts such as `1.5 chairs` are invalid, while fractions are
normal for measured inventory such as fuel or cable. Tying validation to the
unit prevents invalid quantities without restricting legitimately measured
stock.

#### DEC-009: Support optional component relationships

- **Status:** Superseded
- **Area:** Inventory model
- **Superseded by:** Area 1 / DEC-013

This decision previously allowed optional component or setup relationships. It
no longer applies. Inventory units shall not be attached through a component or
composite relationship model.

#### DEC-010: Allow only one active installed-in relationship per component

- **Status:** Superseded
- **Area:** Inventory model
- **Superseded by:** Area 1 / DEC-013

This relationship constraint no longer applies because the component or
composite relationship model has been removed.

#### DEC-011: Support controlled category-specific attributes

- **Status:** Accepted
- **Area:** Inventory definitions and classification

Authorized inventory administrators shall be able to define attributes that
apply to catalogue items or inventory units within a particular category.

Category-specific attributes supplement the system's standard inventory fields.
They shall not replace standard concepts such as category, stock type, tracking
method, base unit, identity number, condition, custodial organizational unit,
current holder, or physical location.

Each attribute definition shall include:

- a name;
- an optional description or data-entry guidance;
- a data type;
- whether a value is required or optional; and
- the category to which it applies.

Supported attribute types shall include at least:

- text;
- number;
- date;
- yes/no; and
- predefined choice.

Examples include:

- `Chassis number` and `Engine number` for vehicles;
- `RAM` and `Storage capacity` for computers;
- `Material` and `Dimensions` for furniture; and
- `Fuel grade` for fuel.

Attribute values shall remain structured so that the system can validate,
search, filter, and report on them. A general notes field may still exist for
exceptional context, but it shall not be the primary mechanism for routinely
required category data.

Deleting or materially changing an attribute definition that has already been
used shall not destroy its historical values. V1 editing and archival follow
the rules below; any later semantic migration requires its own data-governance
and technical-design decision.

In V1 an attribute definition applies only to its exact category; child
categories do not inherit it. Once affected catalogue items or inventory units
exist, the definition's type, category, requiredness, scope, and removal of a
used predefined choice shall require a separately authorized controlled
migration. Labels and guidance may receive versioned edits, new predefined
choices may be added, and the definition may be archived while its historical
values remain readable.

The optional description is also the attribute's data-entry guidance; V1 shall
not create two overlapping fields. Active attribute names shall be normalized
and unique within their exact category. A predefined-choice definition shall
have at least one active choice. Its active choice labels shall be normalized
and unique within that attribute, and its active choices shall have an explicit
administrator-controlled display order.

Predefined choices shall never be permanently deleted. An unused choice may be
archived and later restored, but an active definition shall retain at least one
active choice. A used choice shall not be renamed or archived through ordinary
administration because doing so could reinterpret or remove a historical
value. New choices and presentation-only reordering remain permitted after
use. A used choice may be removed or repurposed only through the separately
authorized controlled-migration boundary above.

Attribute semantics become locked when the first affected target exists, even
when the attribute is optional and that target has no value. Catalogue-scoped
definitions therefore lock with the first exact-category catalogue item, and
inventory-unit-scoped definitions lock with the first exact-category inventory
unit. A particular predefined choice becomes used only when a value selects
it. These monotonic markers shall be maintained atomically by the consuming
target/value workflow and remain explainable from the preserved target and
value history.

Controlled attributes are appropriate when a value must be structured,
required, validated, filtered, or reported consistently. Unpredictable shared
detail that does not require those controls may remain in the catalogue item's
optional description; a second free-form specifications field shall not be
introduced.

Catalogue capture shall remain description-first and deliberately minimal. V1
shall not seed attributes, infer them from a category, or encourage collection
merely because a detail could be recorded. An exact category may have no
attributes. Administrators should introduce a controlled attribute only for a
demonstrated identification, operational, compliance, validation, filtering,
or reporting need; required attributes should be exceptional. Ordinary shared
recognition and specification details belong in the catalogue item's optional
description.

After exact-category catalogue items exist, a new optional catalogue-scoped
definition locks immediately because existing items already omit its value. A
new required definition shall require a controlled backfill rather than making
existing items silently invalid. Restoring a required definition is permitted
only when every affected current item already has a valid value or a separately
authorized backfill workflow supplies one.

##### Reason

Future categories will require details that cannot all be predicted during
initial development. Controlled typed attributes provide extensibility without
reducing important information to unvalidated, unreportable notes.

#### DEC-012: Give category-specific attributes an explicit scope

- **Status:** Accepted
- **Area:** Inventory definitions and classification

Every category-specific attribute definition shall have one of these scopes:

- **Catalogue scope:** One value is shared by all inventory holdings that
  reference the catalogue item.
- **Inventory-unit scope:** A value is recorded separately for each
  individually tracked physical unit.

Examples:

- A shared model specification such as `RAM` may use catalogue scope.
- A unique identifier such as `Chassis number`, `Registration number`, or
  manufacturer serial number uses inventory-unit scope.

The authorized inventory administrator shall choose the scope when defining the
attribute.

After values have been recorded, the attribute's scope shall not be directly
editable. A scope change shall require a controlled migration that defines how
existing values are preserved or transformed. The migration shall be
authorized and auditable; its detailed workflow will be decided during data
governance and technical design.

For V1 ordinary administration uses the stricter shared semantic lock above:
scope is no longer directly editable after the first affected target exists.
This prevents an optional attribute with an omitted value from changing scope
after records have already been created under its original meaning.

##### Reason

Supporting both scopes avoids duplicating shared specifications while still
representing unit-specific facts. Restricting later scope changes prevents
existing values from becoming ambiguous or being silently lost.

#### DEC-013: Keep all inventory units independent

- **Status:** Accepted
- **Area:** Inventory model
- **Supersedes:** Area 1 / DEC-009, Area 1 / DEC-010

The system shall not model component attachments, composite membership,
`installed in`, `used with`, or parent-child relationships between inventory
units.

CPUs, monitors, keyboards, mice, tools, curtains, and every other inventory unit
shall remain independent. Each unit retains its own:

- identity;
- catalogue item;
- physical location;
- custodial organizational unit;
- current holder;
- condition and availability;
- value; and
- lifecycle and movement history.

Items acquired or used together shall not form a union inventory product.
Excess, backup, replacement, or separately used units require no special
relationship state.

Users may explicitly select several independent units in one batch operation
when they happen to move together. Batch selection shall not create or imply a
persistent relationship between them.

##### Reason

Physical items may be purchased in phases, held as spares, replaced, lost,
damaged, or used with different equipment over time. A component relationship
model would add coupling without being required to track the inventory itself.
Independent records preserve the physical and operational reality.

### Area 2 — Tracking Method Rules

#### DEC-001: Use one active tracking method per catalogue item

- **Status:** Accepted
- **Area:** Tracking method rules

Every catalogue item shall have exactly one active tracking method:

- individually tracked; or
- quantity tracked.

All current inventory holdings for the catalogue item shall conform to that
method. The system shall not allow a catalogue item to have a quantity balance
and separately identified physical units at the same time.

If the institute needs to change the tracking method after inventory exists, it
shall use an authorized, auditable conversion process rather than directly
editing the catalogue item:

- Converting from quantity tracking to individual tracking shall reconcile the
  existing balance and create the corresponding individual inventory records.
- Converting from individual tracking to quantity tracking shall reconcile the
  selected physical units into a quantity balance without erasing their
  historical records.

The detailed authorization, validation, and reversal rules for these conversions
will be decided during inventory operations and permissions discovery.

##### Reason

Allowing both tracking representations simultaneously would make availability,
movement, and stock-taking ambiguous and could result in double-counting.
Requiring one active method enforces the distinction established in Area 1 /
DEC-001 while permitting controlled future change.

#### DEC-002: Require explicit tracking-method selection with system guidance

- **Status:** Accepted
- **Area:** Tracking method rules

An authorized user shall explicitly select and confirm the tracking method when
creating a catalogue item. The method shall be selected before any inventory
holdings are entered for that item.

The system may recommend individual or quantity tracking and shall explain the
reason for its recommendation. Recommendations may consider information such as
stock type and category, but they remain guidance rather than an automatic
decision.

The system shall not silently infer or assign a tracking method. This is
necessary because stock type alone is insufficient: consumables will usually
use quantity tracking, while fixed/non-consumable items may require either
individual or quantity tracking.

After inventory exists, the tracking method may change only through the
controlled conversion established in Area 2 / DEC-001.

##### Reason

Explicit confirmation makes the user aware of the operational consequences
before stock is entered. Guidance assists nontechnical users without allowing an
imperfect heuristic to determine how inventory is represented.

#### DEC-003: Give every individually tracked unit a domain identifier

- **Status:** Accepted
- **Area:** Tracking method rules

Every individually tracked inventory unit shall receive a unique, permanent,
system-generated inventory identifier.

This identifier shall:

- be created by the system when the inventory unit is created;
- remain immutable throughout the unit's lifecycle;
- remain reserved even after the unit is disposed of, lost, archived, or
  otherwise becomes inactive;
- identify the inventory unit independently of its current physical location,
  custodial organizational unit, current holder, or condition; and
- never be reused for another inventory unit.

The domain inventory identifier shall be distinct from:

- the database row identifier or primary key;
- an institute-assigned asset number or tag; and
- a manufacturer serial number.

The database may use UUIDs or another internal key strategy, but business
tracking, audit history, reports, integrations, and user workflows shall not
depend on database row identifiers.

Institute asset numbers and manufacturer serial numbers may be recorded as
separate identifiers when available. Their absence shall not prevent the unit
from being entered or reliably tracked.

The inventory-unit identifier shall use the reserved exact format
`INV-000001`: the uppercase `INV-` prefix followed by a zero-padded six-digit
PostgreSQL sequence. Sequence gaps are permitted, identifiers have no check
digit, and issued values are never reused. This contract is recorded during
Week 3 and implemented with inventory-unit intake in Week 4.

##### Reason

Historical records contain missing and inconsistent institute identity numbers
and manufacturer serial numbers. A system-owned domain identifier gives every
physical unit a predictable identity without coupling the business model to
external numbering schemes or database implementation details.

#### DEC-004: Make the domain inventory identifier human-readable and user-visible

- **Status:** Accepted
- **Area:** Tracking method rules
- **Revised by:** Area 4 / DEC-004

The permanent domain inventory identifier established in Area 2 / DEC-003 shall
be:

- visible to authorized users;
- human-readable;
- usable in searches, reports, and audit history.

`INV-000123` illustrates the intended readability but is not an accepted final
format. The exact prefix, sequence, and check digit requirements will be decided
during identification and interface design.

##### Reason

A readable identifier allows staff to communicate and verify an item's identity
without exposing or depending on a database key.

### Area 3 — Organization, Locations, and Custody

#### DEC-001: Separate ownership, custodial accountability, possession, and location

- **Status:** Accepted
- **Area:** Organization, locations, and custody
- **Clarified by:** Area 3 / DEC-010

The system shall represent these as separate concepts:

- **Institutional owner:** The institute that owns the inventory.
- **Custodial organizational unit:** The department, office, or other
  organizational unit accountable for the inventory.
- **Current holder:** The person or organizational unit currently possessing
  the inventory.
- **Physical location:** The place where the inventory is currently located.

Changing one shall not silently change the others.

For example, a computer may remain owned by the institute and under the
custodial accountability of the ICT department while being physically located
in the Principal's Office and held by the Principal.

The system shall record the current values and preserve time-effective history
for changes in custodial organizational unit, current holder, and physical
location. This history shall support an auditable chain showing who possessed an
item, where it was located, which organizational unit was accountable for it,
and when each change occurred.

The detailed movement, handover, acceptance, approval, and correction workflows
will be decided in the inventory operations area.

##### Reason

Institutional ownership, departmental accountability, current possession, and
physical location answer different questions. Separating them prevents one
change from incorrectly implying another and supports accountability for
current and past inventory.

#### DEC-002: Separate current holders from system user accounts

- **Status:** Accepted
- **Area:** Organization, locations, and custody
- **Clarified by:** Area 3 / DEC-010

A person may be recorded as an inventory unit's current holder without having a
system user account. Likewise, having a system user account does not imply that
the user currently holds inventory.

Audit records shall distinguish between:

- the **current holder**, which identifies the person or organizational unit
  possessing the inventory;
- the **confirming person**, who confirms on behalf of themselves or an
  organizational holder; and
- the **system actor**, whose authenticated account recorded or processed the
  transaction.

Person and organizational-unit records shall therefore exist independently of
authentication accounts. A person may later receive a user account without
changing or replacing their possession history.

##### Reason

Not every member of staff who holds or confirms receipt of inventory needs
access to the stock management application. Separating the concepts reduces
unnecessary accounts while preserving the holder, the confirming person, and
the person who performed a system action.

#### DEC-003: Require controlled handover for possession and custody transfers

- **Status:** Accepted
- **Area:** Organization, locations, and custody
- **Clarified by:** Area 3 / DEC-010

A possession handover or custodial-organizational-unit transfer shall use a
two-sided confirmation workflow:

1. An authorized system user initiates the transfer.
2. The transfer remains pending and does not silently become a completed
   handover.
3. When possession changes, the source holder or authorized source officer
   confirms physical release, and the destination holder or authorized
   receiving officer confirms physical receipt.
4. When the custodial organizational unit changes, an authorized officer for
   the source unit confirms release of accountability, and an authorized officer
   for the destination unit accepts accountability.
5. When one transaction changes both dimensions, it shall collect all
   confirmations required for both changes without duplicating a person's
   confirmation unnecessarily.
6. The system completes the transfer and updates the authoritative current state
   only after all required confirmations are present.

The system shall retain the initiating actor, releasing party, receiving party,
any organizational holder represented by a confirming officer, timestamps,
affected inventory, source and destination, and condition or comments recorded
during handover.

A completed handover shall not be directly edited or deleted. An error shall be
handled through a linked, authorized correction or reversal.

When electronic confirmation is unavailable, the system shall support a
numbered handover form that can be signed and attached as supporting evidence.
An authorized officer who records a paper acknowledgement shall be captured as
the system actor; they shall not replace the identity of the actual releasing or
receiving party.

Controls may be proportional to the event:

- A possession handover or custodial-unit transfer requires source release and
  destination receipt confirmation.
- A location-only change under the same holder and custodial unit may use a
  lighter authorized workflow.
- Loss, disposal, or high-value transfers may require independent approval and
  additional evidence.

Unconfirmed transfers shall remain visible as pending exceptions. Detailed
approval thresholds and timeout handling will be decided in the inventory
operations area.

##### Reason

The system can prove who recorded a claim but cannot by itself prove that a
physical movement occurred. Two-sided acknowledgement, supporting evidence, and
immutable history make false or disputed movements harder and attributable.

#### DEC-004: Support recipient-controlled email confirmation

- **Status:** Accepted
- **Area:** Organization, locations, and custody
- **Clarified by:** Area 3 / DEC-010

The system shall support email-based confirmation for a receiving person who
does not have a system account. The receiving person may confirm for themselves
as the current holder or as an authorized receiving officer acting for an
organizational current holder.

A movement or transfer may send a confirmation challenge to the recipient's
verified email address. The challenge shall:

- identify the specific transaction and affected inventory;
- be single-use;
- expire after a defined period;
- limit failed verification attempts; and
- remain inaccessible to the initiating user.

Successful verification shall record the intended current holder, confirming
person, transaction, verification time, and system actor when an officer enters
the recipient-provided code.

The transfer shall remain pending until the recipient-controlled confirmation
or an authorized fallback procedure is completed. Email confirmation establishes
recipient participation in the recorded handover; it does not eliminate
physical stock-taking or additional evidence required for higher-risk assets.

The recipient's email address shall come from an independently maintained person
record. It shall not be freely replaced by the transfer initiator during the
transaction.

Confirmation methods shall be attempted in this order:

1. **Direct recipient confirmation:** The recipient opens a transaction-specific
   no-login link, reviews the inventory and recorded condition, and personally
   confirms or rejects receipt.
2. **Officer-entered one-time code:** When direct confirmation is impractical,
   the recipient provides the transaction-specific code to an authorized
   receiving officer. The system records both the recipient and the officer who
   entered the code.
3. **Signed handover evidence:** When verified email is unavailable, an
   authorized fallback uses a numbered, signed handover record attached to the
   transaction.

The recipient-facing confirmation shall show enough transaction detail for an
informed decision and shall permit rejection or discrepancy reporting rather
than offering confirmation as the only action.

Higher-risk movements may require additional independent approval or evidence
regardless of which recipient-confirmation method is used.

##### Reason

A transaction-specific challenge allows a non-user holder or an officer acting
for an organizational holder to participate in confirmation without receiving
a full system account. Verified contact details and challenge controls reduce
the risk of an initiator confirming a transfer on the recipient's behalf.

#### DEC-005: Use a hierarchical custodial-organizational structure

- **Status:** Accepted
- **Area:** Organization, locations, and custody
- **Builds on:** Area 3 / DEC-001
- **Clarified by:** Area 3 / DEC-010

Organizational units shall support a parent-and-child hierarchy for inventory
custodial accountability, reporting, audit scope, permissions, and approval
routing.

Each organizational unit may have one parent. A parent is optional, allowing
the institute to begin with independent top-level units and add confirmed
relationships as needed.

Example:

```text
Academics
├── Business Department
└── Entrepreneurship Office
```

The hierarchy shall support:

- reporting for one organizational unit or its full descendant structure;
- audit and stock-take scope by organizational branch;
- custody-accountability and permission scopes that may include descendant
  units;
- approval routing to a confirmed parent unit; and
- unambiguous paths where units have similar names.

Organizational hierarchy shall model inventory custody accountability rather
than attempting to reproduce every HR or informal reporting relationship.

The system shall prevent circular parent relationships. An organizational unit
shall not be its own parent or a descendant of itself.

Organizational units and parent relationships shall be maintainable by
authorized administrators. Units that have historical activity shall be
archived rather than deleted.

When the institute reorganizes, changes shall use effective dates and preserve
the prior structure. Historical reports and audit records shall resolve units
using the organizational relationships that applied at the relevant time,
rather than rewriting history to match the current hierarchy.

This structure shall remain separate from the physical-location hierarchy, even
when an organizational unit and a room or office share the same name.

##### Reason

The current manual process makes consolidated reporting and auditing slow and
error-prone. A custodial-organizational hierarchy allows the system to calculate
department and division totals, scope audits, and trace accountability without
manually reconstructing organizational relationships for every exercise.

#### DEC-006: Use a separate physical-location hierarchy

- **Status:** Accepted
- **Area:** Organization, locations, and custody
- **Builds on:** Area 3 / DEC-001

Physical locations shall support a parent-and-child hierarchy that is separate
from the custodial-organizational hierarchy.

Example:

```text
Main Campus
└── Administration Block
    └── First Floor
        └── Principal's Office
```

A store may use more granular locations when useful:

```text
Central Store
└── ICT Storage Area
    └── Shelf B
```

Each physical location may have one parent. A parent is optional, and the
institute shall choose the level of detail appropriate to each part of its
premises.

The hierarchy shall support:

- locating inventory at a specific place;
- reporting or stock-taking for one location and all its descendants;
- recording movement between locations;
- identifying storage areas, shelves, or bins where that precision is useful;
  and
- distinguishing physical places that have similar names by their full paths.

The system shall prevent circular parent relationships. Locations with
historical activity shall be archived rather than deleted.

Authorized administrators may add, reorganize, or archive locations.
Reorganization shall preserve effective-dated historical relationships so
previous movements, reports, and audits remain accurate.

An organizational unit and a physical location may have similar display names,
such as `Principal's Office`, but shall remain distinct records with different
business meanings.

##### Reason

Auditing and movement tracking require more precision than free-text locations.
A hierarchy permits an audit to cover an entire campus or building while still
allowing an item to be found in a particular room, storage area, shelf, or bin.

#### DEC-007: Make every inventory holding location-accounted

- **Status:** Accepted
- **Area:** Organization, locations, and custody
- **Builds on:** Area 1 / DEC-005, Area 2 / DEC-001, Area 3 / DEC-006

Every active inventory holding shall be accounted for by physical location.

For individually tracked stock:

- each inventory unit shall have one current physical location; and
- temporary absence of a confirmed location shall use an explicit state such as
  `in transit` or `location unknown`, rather than a blank or misleading
  location.

For quantity-tracked stock:

- balances shall be maintained separately by physical location;
- one catalogue item may have balances in multiple locations; and
- movement shall subtract quantity from the source-location balance and add it
  to the destination-location balance.

Example:

`Plastic Chair` may have a balance of six in the boardroom and four in the
central store. The system shall not reduce those records to an unexplained
institute-wide balance of ten.

`Location unknown` shall be treated as an exception requiring investigation,
not as a normal permanent location. `In transit` shall be associated with an
active movement process. Detailed reservation and completion timing will be
defined in the inventory movement workflow.

Location changes and exception states shall preserve history, including the
effective time and the system actor or transaction responsible for the change.

##### Reason

A location hierarchy cannot support precise auditing if holdings are allowed to
exist without location context. Location-accounted balances make availability,
movement, discrepancy investigation, and physical stock-taking reconcilable.

#### DEC-008: Make every inventory holding custody-accounted

- **Status:** Accepted
- **Area:** Organization, locations, and custody
- **Builds on:** Area 1 / DEC-005, Area 2 / DEC-001, Area 3 / DEC-001,
  Area 3 / DEC-005
- **Clarified by:** Area 3 / DEC-010

Every active inventory holding shall have exactly one current custodial
organizational unit.

For individually tracked stock, each physical unit shall have one custodial
organizational unit at a time.

For quantity-tracked stock, balances shall be maintained by both physical
location and custodial organizational unit. The same catalogue item at one
location may therefore have separate balances under different organizational
units.

Example:

Ten reams of paper in the central store may consist of six under Human Resources
and four under Internal Audit. Those balances shall remain distinguishable even
though they occupy the same physical location.

A physical-location or possession change shall not automatically change the
custodial organizational unit. A custody change shall use the controlled
transfer workflow.

Newly ingested inventory that has not yet been allocated may use an explicit
temporary `pending allocation` state. This shall be treated as an exception
requiring resolution rather than as missing or permanent custody accountability.

Custodial-unit changes and exception states shall preserve effective-dated
history and the system actor or transaction responsible for each change.

##### Reason

Physical location answers where inventory is, while the custodial organizational
unit identifies which unit must account for it. Requiring both makes reports,
transfers, and audits precise and prevents physical movement or onward lending
from silently changing accountability.

#### DEC-009: Record one current holder for each active inventory unit

- **Status:** Accepted
- **Area:** Organization, locations, and custody
- **Builds on:** Area 3 / DEC-001, Area 3 / DEC-002, Area 3 / DEC-003,
  Area 3 / DEC-008
- **Clarified by:** Area 3 / DEC-010

Each active individually tracked inventory unit shall have one current holder
at a time when it is not in transit or another explicit exception state. The
holder may be a person or an organizational unit.

When an individually tracked unit is handed to a person:

- that person shall become the current holder;
- the possession change shall use the controlled handover workflow; and
- the system shall preserve the effective-dated holder history.

Shared or stored inventory may name an organizational unit as its current
holder. For example, a shared boardroom projector may remain in the possession
of Administration while another confirmed organizational unit remains its
custodial unit.

Quantity-tracked stock balances shall not require a separate person or
organizational current holder. Their custodial organizational unit and physical
location provide the continuing accountability defined in Area 3 / DEC-007 and
DEC-008.

Issuing a consumable may record the person who received it, but shall not create
an enduring current-holder record over stock expected to be consumed.

##### Reason

Allowing either an organizational or personal holder reflects shared, stored,
and personally held inventory without creating misleading personal assignments
for quantity balances. One current holder preserves a traceable chain of
possession.

#### DEC-010: Separate custodial accountability from current possession

- **Status:** Accepted
- **Area:** Organization, locations, and custody
- **Builds on:** Area 3 / DEC-001, Area 3 / DEC-003, Area 3 / DEC-008,
  Area 3 / DEC-009

The custodial organizational unit and current holder shall have different
business meanings:

- the **custodial organizational unit** is the department, office, or other
  organizational unit accountable for the inventory; and
- the **current holder** is the person or organizational unit currently
  possessing an individually tracked inventory unit.

The institute remains the institutional owner in both cases.

A possession handover shall change the current holder without changing the
custodial organizational unit. A custody transfer shall change the accountable
organizational unit without silently changing the current holder or physical
location.

An initial departmental assignment from store-held stock shall explicitly
transfer both custody accountability and possession to the selected destination
organizational unit. The transaction and confirmation interface shall show both
changes.

One coordinated transaction may explicitly change current holder, custodial
organizational unit, and physical location together. Every selected change shall
be confirmed and recorded. Any dimension not explicitly selected shall remain
unchanged.

Example:

1. A monitor initially assigned from a store to Human Resources makes HR both the
   custodial organizational unit and current holder.
2. HR may then lend the monitor to Finance. Finance becomes the current holder,
   while HR remains the custodial organizational unit.
3. A later permanent custody transfer may make Finance the custodial
   organizational unit as a separate, explicit change.

An inventory unit can have only one current holder at a time. It may be handed
onward through a new confirmed possession handover while its custodial
organizational unit remains unchanged, unless an explicit custody transfer
occurs.

Temporary possession loans, required return dates, returns, and reloans are
defined in Area 6 / DEC-009.

##### Reason

Custody identifies continuing departmental accountability; possession
identifies who currently has the unit. Treating them as the same concept would
either prevent legitimate onward lending or incorrectly move accountability
whenever possession changes.

### Area 4 — Item Identification and Codes

#### DEC-001: Treat institute asset numbers as optional unique external identifiers

- **Status:** Accepted
- **Area:** Item identification and codes
- **Builds on:** Area 2 / DEC-003, Area 2 / DEC-004

An institute-assigned asset number shall be stored separately from the
system-generated domain inventory identifier and manufacturer serial number.

An institute asset number shall:

- be optional when no reliable number is available;
- identify exactly one individually tracked physical unit;
- be unique when provided;
- remain associated with the same inventory unit throughout its history; and
- never be reused, including after loss, disposal, or archival.

The absence of an institute asset number shall not prevent inventory entry or
tracking because every individually tracked unit already has the permanent
domain identifier established in Area 2 / DEC-003.

One institute asset-number field shall not contain a range representing multiple
physical units. A historical value such as `MATTI/DPA/CH/01-03` shall be handled
during migration according to the actual tracking model:

- if the three chairs are individually tracked and the individual numbers are
  reliable, create three inventory units with their exact asset numbers; or
- if the chairs remain quantity tracked, retain the range as source evidence or
  a migration note rather than treating it as one asset identifier.

Quantity-tracked stock may have a catalogue or stock code for identification,
but shall not use one physical asset number to represent a quantity balance.

Manufacturer serial numbers shall remain separate identifiers. Duplicate,
conflicting, or malformed imported asset numbers shall be flagged for review
rather than silently corrected or accepted as unique.

##### Reason

Historical reports contain missing identifiers, inconsistent formats, and
ranges. Treating the institute asset number as a precise optional external
identifier preserves useful legacy information without weakening the
predictable system identity or creating ambiguous ownership of one code by
several physical units.

#### DEC-002: Give every catalogue item a permanent domain code

- **Status:** Accepted
- **Area:** Item identification and codes
- **Builds on:** Area 1 / DEC-005, Area 2 / DEC-003

Every catalogue item shall receive a unique, permanent, human-readable,
system-generated catalogue code.

The catalogue code shall:

- be created by the system with the catalogue item;
- remain stable if the item's name, category, description, or other details
  change;
- remain reserved after the catalogue item is archived;
- never be reused for another catalogue item; and
- be usable in searches, reports, audit records, and integrations.

The catalogue code shall be distinct from:

- the database row identifier or primary key;
- the permanent domain identifier of an individual inventory unit;
- an institute-assigned physical asset number;
- a manufacturer serial number; and
- an external, legacy, supplier, or procurement stock code.

This code applies to both individually tracked and quantity-tracked catalogue
items. For quantity-tracked stock, it provides stable identification even
though no separately identified physical unit exists.

Catalogue codes shall use the exact format `ITEM-000001`: the uppercase
`ITEM-` prefix followed by a zero-padded six-digit PostgreSQL sequence. Sequence
gaps are permitted, codes have no check digit, and issued values are never
reused.

##### Reason

Catalogue names and categories can change, and different items may have similar
names. A stable domain code makes catalogue references predictable without
exposing or depending on database UUIDs or mutable external numbering schemes.

#### DEC-003: Treat manufacturer serial numbers as optional supporting identifiers

- **Status:** Accepted
- **Area:** Item identification and codes
- **Builds on:** Area 1 / DEC-011, Area 2 / DEC-003

A manufacturer serial number shall be stored separately from the permanent
domain inventory identifier and institute asset number.

Manufacturer serial numbers shall:

- be optional by default because some items have none and historical records
  may be incomplete;
- be requireable for selected categories or entry workflows when the institute
  establishes that policy;
- preserve the value as entered or imported; and
- not be offered as a user-facing inventory search method.

The system may normalize a serial number internally for duplicate detection
without replacing the preserved original value.

When a likely duplicate is detected, the system shall require review rather
than silently accepting it. An authorized user may accept a duplicate only with
a recorded explanation, allowing uncertain historical data to be retained
without treating the serial number as the authoritative identity.

The permanent system-generated domain inventory identifier shall remain
authoritative when a manufacturer serial number is absent, incorrect,
duplicated, or later corrected.

##### Reason

Serial-number quality and availability vary across inventory and historical
records. Retaining serials as supporting evidence is useful, but business
tracking and user lookup should rely on predictable system-owned identifiers.

#### DEC-004: Exclude barcode, QR, and physical-labelling capabilities

- **Status:** Accepted
- **Area:** Item identification and codes
- **Revises:** Area 2 / DEC-004

Generating or printing physical labels and using barcode or QR scanning hardware
are outside the current system scope.

The system shall not currently require:

- barcode or QR generation;
- barcode or QR scanners;
- label printers;
- label-layout design; or
- scanning workflows.

System-generated inventory identifiers and catalogue codes shall remain
human-readable and usable through the application, reports, and manual entry.

Institute asset numbers or tags assigned through an external physical-tagging
process may still be recorded. The stock management system is not responsible
for producing or applying those tags.

Adding physical labelling or scanning later shall require an explicit scope
change and confirmation of the necessary hardware and operational process.

##### Reason

No barcode, QR, scanner, or label-printer requirement was provided. Including
such functionality would introduce unconfirmed hardware, support, and workflow
dependencies beyond the agreed system scope.

#### DEC-005: Use non-semantic system-generated codes

- **Status:** Accepted
- **Area:** Item identification and codes
- **Builds on:** Area 2 / DEC-003, Area 2 / DEC-004, Area 4 / DEC-002

System-generated domain identifiers shall use simple, human-readable,
non-semantic codes.

The inventory-unit and catalogue-item code namespaces shall be distinguishable.
Their accepted formats are:

- `INV-000001` for an individually tracked inventory unit; and
- `ITEM-000001` for a catalogue item.

The code shall not embed mutable or organizational business information,
including:

- department or custodial organizational unit;
- physical location;
- category;
- current holder;
- condition or lifecycle status; or
- acquisition year.

Those facts shall remain separate, reportable fields with their own history.
Meaningful legacy institute asset numbers may still be retained as external
identifiers without controlling the format of the permanent system code.

Both formats use an uppercase prefix and a zero-padded six-digit PostgreSQL
sequence. Sequence gaps are permitted, neither format has a check digit, and
issued codes are never reused. The inventory-unit format is reserved during
Week 3 and implemented with inventory-unit intake in Week 4.

##### Reason

An identifier must remain valid when an item moves, changes category, changes
custodial organizational unit or current holder, or outlives the organizational
structure under which it was first entered. Embedding mutable facts would make
the code misleading or force an identity change.

#### DEC-006: Preserve external-identifier correction history

- **Status:** Accepted
- **Area:** Item identification and codes
- **Builds on:** Area 4 / DEC-001, Area 4 / DEC-003, Area 4 / DEC-005

System-generated inventory and catalogue codes shall be immutable.

An authorized user may correct or replace an external identifier, such as an
institute asset number or manufacturer serial number, without creating a new
inventory unit.

Every correction or replacement shall preserve:

- the previous value;
- the new value;
- the reason for the change;
- the authenticated system actor;
- the effective date and recorded time; and
- the affected inventory unit.

A replaced institute asset number shall remain retired and shall not be
assigned to another inventory unit.

Imported external identifiers may be marked `unverified` or `conflicting` until
reviewed. Verification or conflict resolution shall also preserve the actor,
time, and explanation.

Identifier history shall form part of the inventory audit trail. Corrections
shall not erase or rewrite movements, custody, possession, stock-taking, or
other activity recorded under the previous value.

The physical database schema for current values and history will be finalized
in Area 16. A normalized relational history is preferred over an in-row JSON
array so that constraints, concurrency, and audit queries remain enforceable.

##### Reason

External identifiers can be mistyped, retagged, or imported from unreliable
records. Correcting them must improve the current record without destroying the
evidence needed to explain what users previously saw and who authorized the
change.

#### DEC-007: Use domain codes in canonical dynamic routes

- **Status:** Accepted
- **Area:** Item identification and codes
- **Builds on:** Area 2 / DEC-003, Area 4 / DEC-001, Area 4 / DEC-002,
  Area 4 / DEC-003, Area 4 / DEC-005, Area 4 / DEC-006

Canonical detail routes shall use dynamic parameters containing permanent
system-owned domain codes:

```text
/catalogue-items/:catalogueCode
/inventory-units/:inventoryCode
```

Example resolved URLs are:

```text
/catalogue-items/ITEM-000142
/inventory-units/INV-000123
```

Database row identifiers shall remain internal implementation details and shall
not be the business identity used in canonical routes.

User-facing identifier lookup shall support:

- permanent catalogue codes;
- permanent inventory-unit codes; and
- current or historical institute asset numbers.

Manufacturer serial numbers shall not be a user-facing lookup method.

An exact institute asset-number lookup shall resolve the corresponding inventory
unit and navigate to its canonical inventory-code route. For example:

```text
Search input: MATTI/ICT/LAP/001
Resolved route: /inventory-units/INV-000123
```

If the search matches a previous asset number retained in identifier history,
the result shall still resolve to the same inventory unit while indicating that
the matched value is historical.

If imported or conflicting data causes an ambiguous match, the system shall
show a disambiguation or review result rather than silently redirecting to one
record.

Broader search by name, category, custodial organizational unit, current holder,
or physical location will be defined in Area 11.

##### Reason

Permanent domain codes provide stable, readable routes even when names,
categories, or external identifiers change. Treating external identifiers as
lookup aliases preserves usability without allowing mutable or disputed values
to become canonical record identity.

### Area 5 — Inventory Intake and Receiving

#### DEC-001: Manual creation immediately creates active stock

- **Status:** Accepted
- **Area:** Inventory intake and receiving
- **Builds on:** Area 1 / DEC-005, Area 1 / DEC-007, Area 3 / DEC-007,
  Area 3 / DEC-008

Stock shall be entered manually by an authorized system user.

Successfully creating the record shall immediately create active inventory:

- for individually tracked stock, creation shall create the physical inventory
  unit; and
- for quantity-tracked stock, creation shall add the entered base-unit quantity
  to the applicable physical-location and custodial-organizational-unit balance.

The system shall not require a separate pending-intake, procurement-import, or
receiving-confirmation stage before the created stock becomes active.

Every creation shall record at least:

- the authenticated creator;
- the creation timestamp;
- the catalogue item;
- the tracking-method-specific inventory details;
- the base-unit quantity where applicable;
- the initial physical location; and
- the initial custodial organizational unit; and
- the initial current holder for individually tracked inventory.

The system shall validate the entry before creation. Once created, errors shall
be corrected through an auditable correction or reversal rather than by erasing
the original creation and its creator.

Purchasing and procurement remain outside the system's domain. No procurement
system integration or automated incoming-stock ingestion is currently required.

##### Reason

The institute has no existing procurement or inventory system from which
ongoing stock will be ingested. Manual creation by an authorized user provides a
clear accountability point because the system records who created the stock and
when it became active.

#### DEC-002: Support batch creation of the same catalogue item

- **Status:** Accepted
- **Area:** Inventory intake and receiving
- **Builds on:** Area 1 / DEC-005, Area 2 / DEC-001, Area 2 / DEC-003,
  Area 5 / DEC-001

One manual creation action may create multiple units or a quantity of the same
catalogue item.

For an individually tracked catalogue item:

- one creation transaction may generate multiple active inventory-unit records;
- each generated unit shall receive its own permanent domain inventory
  identifier;
- shared details such as initial physical location, custodial organizational
  unit, initial current holder, and other common creation information may be
  entered once; and
- unit-specific information, such as institute asset number, manufacturer
  serial number, and unit-scoped attributes, may be entered separately for each
  generated unit.

For a quantity-tracked catalogue item, the creation transaction shall add the
entered base-unit quantity to the applicable location and
custodial-organizational-unit balance rather than generate separate physical
unit records.

The creation transaction shall retain the authenticated creator and timestamp
and link every resulting unit or quantity addition back to that transaction.

##### Reason

Entering shared details repeatedly for several identical items would be slow and
increase inconsistency. Batch creation preserves per-unit identity where needed
while maintaining one accountable record of how the stock was created.

#### DEC-003: Make batch creation atomic

- **Status:** Accepted
- **Area:** Inventory intake and receiving
- **Builds on:** Area 5 / DEC-001, Area 5 / DEC-002

A manual batch-creation submission shall be validated as a complete unit and
committed atomically.

If any entry fails validation, including because of a duplicate or conflicting
identifier:

- no inventory units or quantity addition from that submission shall be
  created;
- the user interface shall identify the affected rows and validation reasons;
  and
- the form shall retain the entered values so the user can correct and resubmit
  them.

Retaining form values does not create pending stock or a partially active batch.
Stock becomes active only when the complete corrected submission succeeds.

When all entries pass validation, the database shall create every resulting
unit or quantity addition within one transaction linked to the same creation
record.

##### Reason

Partial success could leave the system showing fewer units than the user
intended, split one physical intake across creation records, or cause duplicates
when a user resubmits the original form. Atomic creation keeps the requested
quantity, audit record, and resulting inventory consistent.

#### DEC-004: Require stock-creation provenance

- **Status:** Accepted
- **Area:** Inventory intake and receiving
- **Builds on:** Area 5 / DEC-001, Area 5 / DEC-002

Every manual stock-creation action shall record a controlled source type
explaining why the inventory began to exist in the system.

The initial controlled source types shall include:

- opening stock captured when the system is introduced;
- new acquisition;
- donation or grant;
- transfer from outside the institute; and
- other.

Selecting `other` shall require a written explanation.

An external reference number, note, or supporting document may be recorded when
available. These shall remain optional unless institute policy later makes them
mandatory for a particular source type or inventory class.

Creation provenance shall be linked to the creation transaction and therefore
shared by all units or quantity added through one batch. Correcting provenance
shall preserve the previous value, actor, reason, and time.

Recording `new acquisition` as provenance shall not introduce purchase orders,
supplier selection, approval, payment, or other procurement workflows into the
stock management system.

##### Reason

Creator and timestamp establish who entered inventory, but do not explain why
it legitimately entered the records. A controlled source type provides that
audit context without expanding the system into procurement.

#### DEC-005: Limit Area 5 dates to system audit metadata

- **Status:** Accepted
- **Area:** Inventory intake and receiving
- **Builds on:** Area 5 / DEC-001

Every stock-creation transaction shall retain:

- the authenticated creator; and
- the automatic timestamp when the transaction was committed.

These audit facts shall be system-controlled and immutable. A user shall not
backdate or directly edit them.

Area 5 shall not require an acquisition date merely because the historical
stock-take report contains a year-of-purchase field.

Whether acquisition dates serve a confirmed need for valuation, depreciation,
asset age, maintenance, or reporting is deferred to Area 8. Date precision
shall not be designed unless that business need is accepted.

##### Reason

Creator and recorded time are required for accountability when stock becomes
active. Acquisition dates do not directly determine physical quantity,
location, custodial accountability, current possession, or stock-take results
and therefore do not belong in the current intake requirements without a
separate confirmed purpose.

#### DEC-006: Correct mistaken creation through linked reversal

- **Status:** Accepted
- **Area:** Inventory intake and receiving
- **Builds on:** Area 4 / DEC-006, Area 5 / DEC-001, Area 5 / DEC-002,
  Area 5 / DEC-003

Stock-creation transactions and the inventory records they produced shall not be
deleted to conceal or repair an error.

If created stock has no later activity, an authorized user may reverse the
creation:

- the reversal shall link to the original creation transaction;
- the reason, authenticated actor, and time shall be required;
- individually tracked units shall become `entered in error` rather than
  disappear;
- quantity-tracked stock shall receive an equal compensating quantity entry;
  and
- generated domain identifiers shall remain reserved.

If any affected stock has already been moved, issued, transferred, assigned,
used, or included in another dependent transaction, a simple creation reversal
shall be blocked. The error shall instead be resolved through linked corrective
transactions that preserve the validity and order of all subsequent history.

Every correction shall preserve a navigable chain from the original transaction
through each reversal, replacement, or compensating action. Current state shall
reflect the net result of the original and corrective events without erasing
either.

The Store-proposal and independent Store-approval authority for correction is
defined in Area 10 / DEC-017.

##### Reason

Deleting an erroneous creation would remove evidence of who entered it and what
the system previously reported. Linked corrective actions restore accurate
state while retaining a complete audit trail of both the mistake and its course
correction.

### Area 6 — Issues, Returns, Movements, and Transfers

#### DEC-001: Distinguish stock transfers from consumable issues

- **Status:** Accepted
- **Area:** Issues, returns, movements, and transfers
- **Builds on:** Area 1 / DEC-007, Area 3 / DEC-007, Area 3 / DEC-008,
  Area 5 / DEC-004

A stock transfer and a consumable issue shall be separate transaction types with
different effects.

##### Stock transfer

A transfer moves available stock between physical locations, custodial
organizational units, or both.

For quantity-tracked stock, a completed transfer shall:

- subtract the transferred base-unit quantity from the source balance;
- add the same base-unit quantity to the destination balance; and
- leave the institute-wide available quantity unchanged.

##### Consumable issue or use

A consumable issue records stock leaving available inventory for consumption.
A completed issue shall:

- subtract the issued base-unit quantity from the source balance;
- not create a destination stock balance;
- reduce institute-wide available quantity; and
- record the recipient and purpose or reason.

Example:

If Central Store gives five reams of paper to Human Resources:

- recording a transfer means the five reams remain available stock under HR at
  the destination location; or
- recording an issue means the five reams have left available inventory for
  consumption.

The user shall explicitly choose the operation that reflects what occurred. The
system shall not infer consumption merely because stock left a store.

##### Reason

Treating every store release as consumption would hide stock still held by a
department. Treating every release as a transfer would overstate availability
after items have been handed out for use. Explicit transaction types preserve
both departmental and institute-wide balances.

#### DEC-002: Allow coordinated explicit movement changes

- **Status:** Accepted
- **Area:** Issues, returns, movements, and transfers
- **Builds on:** Area 3 / DEC-001, Area 3 / DEC-003, Area 3 / DEC-007,
  Area 3 / DEC-008, Area 3 / DEC-009, Area 3 / DEC-010

One movement transaction may explicitly change one or more of:

- physical location;
- custodial organizational unit; and
- current holder.

Every selected dimension shall record its previous and intended new value.
Dimensions not selected for change shall remain unchanged.

For example, handing an ICT laptop to the Principal may change:

- physical location from `ICT Store` to `Principal's Office`;
- current holder from ICT to the Principal; and
- leave the custodial organizational unit as ICT.

If custody accountability also changes, that change must be selected
explicitly. The system shall not infer a custody transfer from relocation or a
possession handover.

All selected changes shall belong to one coordinated movement and become
effective atomically after the confirmations required by the changed
dimensions. A possession or custodial-unit change shall use the controlled
handover established in Area 3 / DEC-003. A location-only movement may use the
lighter authorized workflow permitted by that decision.

The movement history shall show the complete before-and-after state, initiator,
required participants, reason, and timestamps.

##### Reason

Real handovers commonly change several related facts at once. Separate
transactions would create misleading intermediate states, while automatic
inference would confuse physical movement, possession, and custody
accountability. Explicit coordinated changes preserve both convenience and
meaning.

#### DEC-003: Reserve pending transfers and lock quantity at source release

- **Status:** Accepted
- **Area:** Issues, returns, movements, and transfers
- **Builds on:** Area 3 / DEC-003, Area 3 / DEC-007, Area 3 / DEC-008,
  Area 6 / DEC-001, Area 6 / DEC-002

A submitted transfer shall reserve the selected inventory at its exact source
location and custodial-organizational-unit balance.

The transfer lifecycle shall be:

```text
Submitted
    ↓
Pending release — reserved at source
    ↓
Source confirms release
    ↓
In transit — unavailable at source and destination
    ↓
Destination confirms receipt
    ↓
Completed — available at destination
```

Reserved stock shall remain physically recorded at the source but shall not be
available for another issue, movement, or transfer.

For quantity-tracked stock, only the requested base-unit quantity shall be
reserved. For individually tracked stock, the selected physical units shall be
reserved.

##### Pending amendments

Before source release, an authorized user may increase or reduce the requested
quantity.

Every amendment shall record:

- the previous requested quantity;
- the new requested quantity;
- the actor;
- the reason; and
- the time.

An increase shall be accepted only when the source balance has enough available
unreserved quantity to cover the additional request. Equivalently, the source's
available quantity plus the transfer's existing reservation must be equal to or
greater than the new total requested quantity.

The amendment shall be atomic. If the additional quantity is unavailable, the
increase shall be rejected and the existing reservation shall remain unchanged.
A reduction shall immediately release the excess reservation.

Changing the requested quantity shall invalidate any earlier approval or release
confirmation based on the previous quantity. The source shall review and confirm
the final amended quantity.

##### Source release

Source release shall:

- lock the final quantity or selected inventory units against further editing;
- remove them from source availability; and
- place them in the `in transit` state.

While in transit, stock shall not be available at either the source or
destination.

Cancellation before source release shall remove the reservation. After source
release, the transfer shall not be simply cancelled or edited; it shall require
destination receipt, return, discrepancy resolution, or another linked
corrective transaction.

If destination receipt differs from the released quantity, the released
quantity shall not be rewritten. The difference shall be recorded as a receipt
discrepancy.

Financial value shall not be manually changed merely because requested quantity
changes. Transfer valuation will be derived from the locked released quantity
using the valuation rules decided in Area 8.

##### Reason

Reservation prevents the same stock from being committed twice. Allowing
controlled amendments supports changing needs before collection, while source
availability checks and release locking ensure that the final confirmed
quantity is physically supportable and historically reliable.

#### DEC-004: Support partial receipt with explicit discrepancies

- **Status:** Accepted
- **Area:** Issues, returns, movements, and transfers
- **Builds on:** Area 3 / DEC-003, Area 6 / DEC-002, Area 6 / DEC-003

A destination shall confirm the inventory actually received rather than being
forced to accept the full released transfer.

For quantity-tracked stock:

- the confirmed received quantity shall become available at the destination;
- any difference from the locked released quantity shall remain unresolved
  under the transfer; and
- the released quantity shall not be rewritten to match the receipt.

For individually tracked stock, the destination shall be able to confirm
receipt unit by unit. Received units shall become available at the destination,
while unreceived or disputed units remain unresolved.

A transfer with only some inventory confirmed shall remain `IN_TRANSIT` until
all released inventory is resolved. The system may display
`In transit — discrepancy open`, but discrepancy is attached information rather
than a competing lifecycle state.

Supported receipt discrepancies shall include at least:

- missing or short quantity;
- damaged inventory;
- wrong inventory; and
- excess inventory.

Damaged, wrong, or excess inventory shall not be silently added to normal
available stock. It shall remain in a controlled unresolved state until linked
to an authorized transfer, return, creation, condition event, or corrective
transaction.

Each discrepancy and resolution shall retain the reporting actor, time,
quantity or units affected, reason, and links to the original transfer. Detailed
damage and loss outcomes will be defined in Area 7.

##### Reason

Forcing full acceptance would make system records contradict physical receipt.
Rewriting the released quantity would hide what the source claimed to send.
Partial receipt preserves usable received stock while keeping shortages,
damage, and other differences visible for investigation.

#### DEC-005: Record returns as linked append-only transactions

- **Status:** Accepted
- **Area:** Issues, returns, movements, and transfers
- **Builds on:** Area 4 / DEC-006, Area 5 / DEC-006, Area 6 / DEC-001,
  Area 6 / DEC-002

A return shall be a new immutable business transaction linked to the original
issue, assignment, or transfer. It shall not delete, edit, end-date, or otherwise
rewrite the original event.

Return types shall include:

- a reverse-direction transfer for stock sent back to its source;
- a possession, custody, or location handover when an individually tracked unit
  is returned; and
- an issue return when unused consumables physically re-enter available stock.

An issue return shall not exceed:

```text
original issued quantity - previously returned quantity
```

Stock already consumed cannot be returned. Individually tracked inventory shall
be eligible for return only when its current state and current holder are
consistent with the proposed return.

For a temporary possession-loan return:

- the current holder, or an authorized representative of an organizational
  current holder, shall confirm physical release;
- an authorized officer for the custodial organizational unit shall confirm
  physical receipt;
- one confirmation shall not satisfy both roles; and
- the loan shall not be marked `RETURNED` until both confirmations are present
  and the return movement is completed.

Neither party may unilaterally mark the loan as returned. A rejection or
reported difference shall keep the return unresolved under the canonical
`IN_TRANSIT` and discrepancy rules rather than restore custody or possession
silently. V1 shall not provide a unilateral exceptional override; resolution
shall use the applicable linked discrepancy, investigation, return, or
corrective workflow.

Return processing shall use one atomic database transaction that:

1. locks the original transaction and affected current state or balances;
2. validates return eligibility and remaining returnable quantity;
3. creates the return transaction and its lines;
4. appends the corresponding inventory-ledger entries;
5. updates any current-state or balance projections; and
6. commits all effects together.

A return shall record the returned quantity or units, condition, reason, actor,
time, and original transaction reference.

If a return was itself recorded incorrectly, it shall be corrected by another
linked compensating transaction rather than edited or deleted.

The immutable transaction ledger shall remain the authoritative history.
Current balance or state rows may be updated as projections for efficient reads,
provided they can be explained or rebuilt from the ledger.

##### Reason

An original issue or transfer remains historically true after stock comes back.
A linked return captures the new event and restores current state without
erasing the earlier movement. Locked atomic validation prevents concurrent
returns from exceeding what was originally issued.

#### DEC-006: Use one canonical movement state model

- **Status:** Accepted
- **Area:** Issues, returns, movements, and transfers
- **Builds on:** Area 3 / DEC-003, Area 6 / DEC-002, Area 6 / DEC-003,
  Area 6 / DEC-004, Area 6 / DEC-005

Transfers, consumable issues, returns, possession handovers, and custody
transfers shall use the same canonical transaction states:

```text
PENDING_RELEASE
       ↓
IN_TRANSIT
       ↓
COMPLETED
```

Before source release, a transaction may instead transition:

```text
PENDING_RELEASE → CANCELLED
```

The states mean:

- **PENDING_RELEASE:** The transaction has been submitted, affected stock is
  reserved at the source, and source confirmation is required.
- **IN_TRANSIT:** The source confirmed physical release, affected stock is
  unavailable at the source and destination, and recipient or destination
  confirmation is required.
- **COMPLETED:** All released inventory has been received or otherwise resolved,
  and the transaction-type-specific completion effect has been applied.
- **CANCELLED:** The transaction was stopped before physical release and its
  reservation was removed.

`Pending receipt` shall describe the next required action while a transaction is
`IN_TRANSIT`; it shall not be a separate state.

Receipt discrepancies shall also be attached records rather than lifecycle
states. After partial receipt, received inventory shall receive its completed
effect, while unresolved inventory remains `IN_TRANSIT`. The overall
transaction shall remain `IN_TRANSIT` and may be displayed as
`In transit — discrepancy open` until all released inventory is resolved.

A location-only movement using a lighter authorized workflow may pass through
the state transitions atomically, but its recorded business meaning shall
remain consistent with this model.

##### Reason

One state vocabulary makes workflows, reports, user guidance, and audit history
predictable. Separating lifecycle state from required action and discrepancy
information prevents multiple labels from describing the same physical stage.

#### DEC-007: Require recipient confirmation for consumable issues

- **Status:** Accepted
- **Area:** Issues, returns, movements, and transfers
- **Builds on:** Area 3 / DEC-002, Area 3 / DEC-003, Area 3 / DEC-004,
  Area 6 / DEC-001, Area 6 / DEC-003, Area 6 / DEC-006

Consumable issues shall require both source release and recipient receipt
confirmation.

They shall follow the canonical state model:

1. Submission reserves the requested quantity and enters `PENDING_RELEASE`.
2. Source release locks and subtracts the quantity from source availability and
   enters `IN_TRANSIT`.
3. The named recipient reviews and confirms the item, quantity, and purpose.
4. Recipient confirmation enters `COMPLETED`.

A completed consumable issue shall not create a destination inventory balance.
This is the only stock-effect difference from a completed transfer: the
confirmed quantity has been issued for consumption rather than remaining
available stock at a destination.

The recipient shall confirm using an authenticated account or the non-user
confirmation methods established in Area 3 / DEC-004. Recipient identity and
contact details shall come from the independently maintained person record and
shall not be substituted by the issuer during the transaction.

If the recipient rejects or disputes the issue:

- stock shall not be automatically restored to source availability;
- the transaction shall remain `IN_TRANSIT`;
- the recipient shall record the discrepancy; and
- resolution shall require receipt correction, return, investigation, or
  another authorized linked transaction.

Outstanding recipient confirmation shall remain visible for reminder and
escalation rather than being silently completed. The same person shall not
satisfy both source release and recipient receipt through different accounts,
roles, or delegations. An unresolved issue shall use its linked discrepancy,
return, investigation, or corrective workflow rather than exceptional silent
completion.

Every issue and confirmation shall retain its actor, time, quantity, recipient,
purpose, and linked ledger effects. Corrections shall remain append-only and
atomic.

##### Reason

Recipient confirmation prevents an issuer from attributing stock to someone who
did not receive it and gives the named recipient a way to dispute item or
quantity details. Using the same state model as transfers preserves predictable
workflow while correctly avoiding a destination balance for consumed stock.

#### DEC-008: Move independent inventory units through explicit selection

- **Status:** Accepted
- **Area:** Issues, returns, movements, and transfers
- **Builds on:** Area 1 / DEC-013, Area 3 / DEC-001, Area 3 / DEC-010,
  Area 6 / DEC-002, Area 6 / DEC-003

Every individually tracked inventory unit shall move independently. The system
shall have no component, composite, attachment, or parent relationship from
which movement could cascade.

The user shall explicitly select every unit intended to move.

Each selected unit shall appear as its own movement line and shall be validated
independently before the atomic batch transaction is submitted. If the batch
fails validation, no selected unit shall move and the form shall retain its
entered selection for correction.

Selecting several units in one movement shall provide batch convenience only. It
shall not create a persistent relationship or union product between those
units.

Damage or loss is a lifecycle event handled in Area 7, neither a movement nor a
state change for any other inventory unit.

Examples:

- A damaged HR monitor does not alter or move any CPU, keyboard, or mouse.
- Spare monitors, keyboards, and mice may remain standalone inventory.
- Moving a CPU moves only that CPU unless the user explicitly selects other
  independent units in the same batch.

##### Reason

Independent selection preserves the physical reality of spare, damaged, lost,
replaced, or separately used items and prevents tightly coupled state changes.

#### DEC-009: Make temporary possession loans time-bound and append-only

- **Status:** Accepted
- **Area:** Issues, returns, movements, and transfers
- **Builds on:** Area 3 / DEC-003, Area 3 / DEC-010, Area 6 / DEC-002,
  Area 6 / DEC-005, Area 6 / DEC-006

An individually tracked inventory unit may be handed to a current holder as a
temporary possession loan. Every loan shall have a required exact expected
return date before its possession handover is submitted.

The return date shall be a calendar date represented at system boundaries using
the ISO 8601 `YYYY-MM-DD` format. The frontend may collect it through a date
picker. The physical database representation remains an Area 16 decision; a
native date type is preferred when the selected database supports one.

The movement transaction and the resulting loan shall have separate lifecycle
meanings:

- the possession handover follows the canonical movement states in Area 6 /
  DEC-006;
- completing that handover starts the active loan;
- `COMPLETED` on the handover means that the borrower confirmed possession; it
  does not mean that the inventory unit has been returned; and
- the custodial organizational unit remains unchanged unless the transaction
  also explicitly includes a custody transfer.

A return shall use the controlled, append-only return process in Area 6 /
DEC-005. The loan shall receive a terminal `RETURNED` outcome only after its
linked return movement is completed. A pending or in-transit return shall not be
represented as a completed return.

An expected return date shall not be overwritten to extend a loan. An extension
shall require a new, linked reloan request:

1. The current holder, or an authorized representative of an organizational
   current holder, requests an exact proposed return date.
2. The request records that exact date without changing the active loan.
3. An authorized officer for the custodial organizational unit may only approve
   or reject the requested return date. The officer shall not edit it into a
   different date.
4. The requester shall not approve their own request.
5. Rejection leaves the original loan active, preserves its return date, and
   leaves it overdue when that date has passed. The inventory unit remains due
   for return.
6. Approval completes a no-transit reloan transaction because possession and
   physical location have not changed.

Completing an approved reloan shall:

1. close the previous loan with a `RELOANED` outcome;
2. preserve its original expected return date;
3. create the next active loan with its own required expected return date; and
4. link both loan records and the reloan transaction into one auditable chain.

Only one active loan may exist for an inventory unit at a time. Return and
reloan processing shall lock the inventory unit and its active loan, validate
the current holder and transaction state, and close or replace the active loan
atomically.

The authoritative evidence of return or reloan shall be the linked completed
business transaction. The technical design shall not rely on a nullable
`returned` boolean. A nullable closing time, closing outcome, and closing
transaction reference may be maintained as query projections, provided they
remain explainable from the append-only transaction history.

A loan shall be considered overdue when:

```text
current date > expected return date
AND no completed return or reloan has closed the loan
```

`Overdue` shall be a derived flag rather than another movement or loan state.
Overdue loans shall remain visible and shall trigger notifications. Notification
timing, recipients, repetition, and escalation rules belong to Area 12.

A pending, approved, or rejected reloan request shall retain its requester,
requested return date, decision, deciding officer, and timestamps. A pending
request shall not suspend or hide overdue status.

A same-holder reloan shall not enter `IN_TRANSIT`. It confirms continued
possession rather than claiming that physical release or transportation
occurred. An onward loan to a different holder remains a possession handover and
uses the canonical movement states.

##### Reason

A required return date makes temporary possession enforceable. Linked returns
and reloans preserve every agreed due date and prevent extensions from rewriting
history. Deriving overdue status from time and closing events avoids stale or
contradictory boolean flags.

### Area 7 — Condition, Damage, Loss, Repair, and Disposal

#### DEC-001: Separate condition, operational availability, and loss status

- **Status:** Accepted
- **Area:** Condition, damage, loss, repair, and disposal
- **Builds on:** Area 1 / DEC-001, Area 3 / DEC-010, Area 6 / DEC-006,
  Area 6 / DEC-008

The system shall represent the following as separate concepts:

1. **Physical condition** describes the observed state of stock, such as
   working, faulty, or damaged.
2. **Operational availability** describes whether stock can currently be used
   or transacted, such as available, reserved, in transit, on loan, or under
   repair.
3. **Loss status** describes whether stock is present, missing under
   investigation, confirmed lost, or subsequently recovered.

A value in one concept shall not silently determine or overwrite a value in
another. Any permitted effect between them shall be an explicit business rule
and auditable event.

For example:

- a faulty monitor may still physically exist in HR;
- an item under repair is unavailable for use without being lost;
- an item may be missing while its physical condition is unknown; and
- a completed possession movement does not imply that the item is working.

Report remarks and free text may provide supporting detail, but shall not
replace these separate structured concepts.

##### Reason

The supplied stock-take report mixes condition, availability, and loss in one
working-condition field and its remarks. It includes contradictory combinations
such as `W` with `Not working`, as well as values such as `FAULTY`, `BROKEN`,
`NOT AVAILABLE`, and `missing`. Separating the concepts prevents these
contradictions and permits precise stock, maintenance, and audit reporting.

#### DEC-002: Separate functional condition from physical damage

- **Status:** Accepted
- **Area:** Condition, damage, loss, repair, and disposal
- **Builds on:** Area 7 / DEC-001

Functional condition and physical damage shall be represented separately.

Functional condition describes whether stock performs its intended function.
Its controlled classifications are:

- `WORKING`;
- `PARTIALLY_WORKING`;
- `NOT_WORKING`; and
- `UNKNOWN`.

Physical damage shall be recorded through a separate, auditable damage report
and its lifecycle rather than used as a mutually exclusive functional-condition
value. The damage-report workflow, evidence, resolution, and permitted
corrections will be defined by later Area 7 decisions.

Consequently:

- stock may be `WORKING` while having reported physical damage;
- stock may be `NOT_WORKING` without visible physical damage;
- changing functional condition shall not silently create or resolve a damage
  report; and
- creating or resolving a damage report shall not silently claim that the stock
  is working or not working.

Supporting observations may describe the fault or damage, but shall not replace
the structured functional condition or damage record.

##### Reason

Function and physical damage answer different questions. Keeping them separate
represents cases such as a working monitor with a cracked casing and a
non-working device with no visible damage, while preventing one update from
silently changing the meaning of the other.

#### DEC-003: Partition quantity-tracked stock by functional condition

- **Status:** Accepted
- **Area:** Condition, damage, loss, repair, and disposal
- **Builds on:** Area 1 / DEC-006, Area 1 / DEC-007, Area 3 / DEC-010,
  Area 7 / DEC-001, Area 7 / DEC-002

An individually tracked inventory unit shall have its own functional-condition
history.

A quantity-tracked holding shall be partitioned by functional condition when
different quantities within that holding have different conditions. For
example, a holding of 100 chairs may consist of 93 `WORKING` and 7
`NOT_WORKING` chairs without creating separate catalogue items.

Changing the functional condition of quantity-tracked stock shall be an
append-only reclassification transaction that:

1. identifies the exact holding and affected quantity;
2. locks and validates the source condition balance;
3. subtracts the quantity from the previous condition balance;
4. adds the same quantity to the new condition balance; and
5. records the previous condition, new condition, quantity, reason, actor, and
   time atomically.

The reclassification shall not change the holding's total quantity. Countable
units shall require whole quantities, while measured units may use the decimal
precision permitted for their base unit.

A damage report concerning quantity-tracked stock shall state its affected
quantity. It shall not create or remove stock and shall not silently change its
functional condition.

##### Reason

Applying one condition to an entire quantity balance would misrepresent mixed
holdings. Condition partitions preserve the total while allowing affected stock
to be reported and managed separately without inventing catalogue items or
individual identities.

#### DEC-004: Keep functional-condition classifications system-controlled

- **Status:** Accepted
- **Area:** Condition, damage, loss, repair, and disposal
- **Builds on:** Area 7 / DEC-002, Area 7 / DEC-003

The complete functional-condition classification set shall be
system-controlled:

- `WORKING`;
- `PARTIALLY_WORKING`;
- `NOT_WORKING`; and
- `UNKNOWN`.

Administrators shall not add, rename, merge, or remove functional-condition
classifications. A later change to this classification set shall require an
explicit system-design revision rather than ordinary administrative
configuration.

Users may record structured fault details, reasons, observations, and notes.
Those details shall not create unofficial condition states or replace the
required controlled classification.

Reports may use user-friendly display labels, but every label shall map
unambiguously to one of the four controlled values.

##### Reason

Functional condition drives balance partitions, validation, workflows, and
reporting. Allowing values such as `bad`, `spoilt`, or `needs checking` to be
created casually would reproduce the inconsistent terminology found in the
manual report. Details can evolve without weakening the stable classification.

#### DEC-005: Require explicit functional condition at stock creation

- **Status:** Accepted
- **Area:** Condition, damage, loss, repair, and disposal
- **Builds on:** Area 5 / DEC-001, Area 5 / DEC-002, Area 5 / DEC-003,
  Area 7 / DEC-003, Area 7 / DEC-004

Every manual stock-creation transaction shall explicitly record an initial
functional condition.

The system shall not silently default new stock to `WORKING`. `UNKNOWN` may be
selected when the creator cannot establish the condition, but it shall be an
explicit choice attributable to that creator.

For individually tracked stock, every created inventory unit shall receive an
initial functional condition. A batch form may apply one explicitly selected
condition to all units and permit row-level overrides.

For quantity-tracked stock, every part of the created quantity shall be
allocated to a functional-condition balance. Where the incoming quantity has
mixed conditions, its allocations shall sum exactly to the total quantity being
created.

The initial condition records and the stock creation shall succeed or fail in
one atomic transaction. They shall retain the immutable creator and
system-recording time already required by Area 5.

##### Reason

New purchases may normally be working, but opening stock, donations, and
external transfers may not be. Explicit selection prevents the system from
asserting an unverified condition while retaining efficient batch entry.

#### DEC-006: Require an explicit interim-use disposition for reported damage

- **Status:** Accepted
- **Area:** Condition, damage, loss, repair, and disposal
- **Builds on:** Area 6 / DEC-003, Area 6 / DEC-006, Area 7 / DEC-001,
  Area 7 / DEC-002

Submitting a damage report shall require one explicit interim-use disposition:

- `QUARANTINED`: the reported stock is unavailable for ordinary use, issue, or
  loan; or
- `REMAINS_IN_USE`: the damage report adds no new availability restriction, and
  the reporter must provide a reason.

These values belong to the damage report. They are availability restrictions,
not movement lifecycle states and not functional-condition classifications.

They coexist independently with the complete functional-condition set:

- `WORKING`;
- `PARTIALLY_WORKING`;
- `NOT_WORKING`; and
- `UNKNOWN`.

`REMAINS_IN_USE` shall not make stock available when another rule already makes
it unavailable, reserved, in transit, on loan, under repair, lost, or disposed.
It means only that the reported damage does not add a quarantine restriction.

`QUARANTINED` shall not silently change physical location, custodial
organizational unit, current holder, functional condition, loss status, or an
active movement's lifecycle state. It may permit only the controlled actions
needed to inspect, repair, return, or dispose of the affected stock.

If stock is quarantined while a movement is still `PENDING_RELEASE`, physical
release shall be blocked; the movement must be cancelled or resolved through an
authorized exception. If damage is reported after stock is `IN_TRANSIT`, the
required receipt and discrepancy process shall continue rather than pretending
that the movement did not occur. The quarantine restriction shall remain after
receipt until it is explicitly resolved.

Interim-use disposition authority belongs to `STOCK_SUPERVISOR` under Area 10 /
DEC-011. Technical evidence shall remain attributable to its actual assessor,
and no wider role shall silently override another active restriction.

##### Reason

Damage does not have one universal effect on use: cosmetic damage may not
prevent operation, while apparently working electrical or mechanical stock may
be unsafe. Requiring an explicit decision avoids both silent continued use and
automatic over-quarantining while preserving the independent movement state
model.

#### DEC-007: Preserve damage reports as append-only cases

- **Status:** Accepted
- **Area:** Condition, damage, loss, repair, and disposal
- **Builds on:** System-wide / SYS-001, Area 7 / DEC-002, Area 7 / DEC-003,
  Area 7 / DEC-006

A submitted damage report shall become a permanent, append-only case. Its
original report shall not be edited or deleted.

The controlled damage-case states shall be:

- `OPEN`;
- `RESOLVED`; and
- `ENTERED_IN_ERROR`.

Assessments, evidence, comments, interim-use decisions, corrections, and
resolution details shall be added as timestamped events linked to the original
case. Every event shall retain its actor and reason where applicable.

Resolving a damage case shall require an explicit resolution outcome and
supporting explanation, such as repaired, accepted with damage, or completed
through a linked disposal process. Marking a report `ENTERED_IN_ERROR` shall
require a linked correction reason and shall preserve the report.

Closing a damage case shall not silently change functional condition,
availability, physical location, custodial organizational unit, current holder,
loss status, quantity, or value. Where a resolution legitimately changes one or
more of those concepts, the system shall create their required explicit linked
events in the same atomic business transaction.

##### Reason

Damage history is audit evidence. Preserving both the original report and every
later assessment or resolution prevents a user from concealing an incident and
keeps corrections consistent with the system-wide append-only model.

#### DEC-008: Distinguish missing, confirmed loss, and recovery

- **Status:** Accepted
- **Area:** Condition, damage, loss, repair, and disposal
- **Builds on:** System-wide / SYS-001, Area 7 / DEC-001

The current loss status of stock shall follow this controlled lifecycle:

```text
PRESENT
  → MISSING_UNDER_INVESTIGATION
  → CONFIRMED_LOST
```

`MISSING_UNDER_INVESTIGATION` records that the stock cannot currently be
accounted for without prematurely concluding that it is permanently lost.
`CONFIRMED_LOST` records the later, explicit conclusion of the loss process.

Recovery from either `MISSING_UNDER_INVESTIGATION` or `CONFIRMED_LOST` shall:

1. create an append-only `RECOVERED` event linked to the loss case;
2. close that case with a recovered outcome;
3. preserve every missing, investigation, loss, and recovery event; and
4. return the stock's current loss status to `PRESENT`.

`RECOVERED` shall therefore be a historical event and loss-case outcome, not a
permanent current loss status. If the same stock later goes missing again, the
system shall create a new loss case rather than reopen or overwrite the
previous one.

Every transition shall retain its actor, time, reason, and supporting evidence
when required by institute policy. Corrections shall follow System-wide /
SYS-001 and shall not delete or rewrite the original events.

##### Reason

Missing stock is not necessarily lost, and recovered stock is presently
available for accountability again even though its loss history remains
important. Separating current status from historical recovery provides an
accurate current view without concealing prior incidents.

#### DEC-009: Restrict reported-missing stock pending investigation

- **Status:** Accepted
- **Area:** Condition, damage, loss, repair, and disposal
- **Builds on:** System-wide / SYS-001, Area 6 / DEC-003,
  Area 6 / DEC-006, Area 7 / DEC-001, Area 7 / DEC-008

An authorized reporter may open a missing-stock case without first obtaining
confirmation from the current holder or custodial organizational unit. The
reporting and confirmation allocation is defined in Area 10 / DEC-011.

Opening the case shall atomically:

1. set the affected stock's current loss status to
   `MISSING_UNDER_INVESTIGATION`;
2. make it unavailable for new ordinary issues, loans, or transfers;
3. record the reporter, system-recording time, reason, and affected inventory
   unit or quantity; and
4. initiate notification to the current holder and custodial organizational
   unit, with notification mechanics deferred to Area 12.

The missing report is a precautionary and investigative record. It shall not be
treated as proof of permanent loss or wrongdoing by the current holder,
custodial organizational unit, or any person.

The restriction shall not silently change functional condition, damage status,
physical location, custodial organizational unit, current holder, or an
existing movement lifecycle state. If the stock is already involved in a
movement, that movement and any receipt discrepancy shall remain explicit and
be resolved through their applicable workflows.

Only a separately authorized decision may change
`MISSING_UNDER_INVESTIGATION` to `CONFIRMED_LOST`. A mistaken report concerning
stock that was never missing shall be closed through an append-only
`ENTERED_IN_ERROR` correction. Stock that genuinely went missing and was later
found shall use the `RECOVERED` event in Area 7 / DEC-008.

##### Reason

Waiting for the accountable parties to approve a missing report could allow a
genuine incident to be suppressed or the stock to be transacted while its
whereabouts are unknown. Immediate restriction protects the record, while the
separate investigation and confirmation process protects people from an
unverified accusation.

#### DEC-010: Partition quantity-tracked stock by loss status

- **Status:** Accepted
- **Area:** Condition, damage, loss, repair, and disposal
- **Builds on:** Area 1 / DEC-007, Area 7 / DEC-001, Area 7 / DEC-003,
  Area 7 / DEC-008, Area 7 / DEC-009

A quantity-tracked holding shall be partitioned by loss status when quantities
within that holding have different loss states.

For example, when 7 chairs from a quantity-tracked holding of 100 are reported
missing, the loss-status quantities become:

- 93 `PRESENT`; and
- 7 `MISSING_UNDER_INVESTIGATION`.

Confirming loss shall reclassify the affected quantity from
`MISSING_UNDER_INVESTIGATION` to `CONFIRMED_LOST`. Recovery shall reclassify it
back to `PRESENT` through the append-only recovery event required by Area 7 /
DEC-008.

Every loss-status reclassification shall:

1. identify the exact holding and affected quantity;
2. lock and validate the source loss-status balance;
3. subtract the quantity from the previous status balance;
4. add the same quantity to the new status balance; and
5. record the previous status, new status, quantity, linked loss case, reason,
   actor, and time atomically.

The loss-status reclassification itself shall preserve the holding's total
accounted quantity. It shall not duplicate stock.

Functional condition and loss status remain independent partition dimensions.
A loss-status change shall preserve the affected quantity's last recorded
functional condition rather than silently reclassify it. The physical database
and projection structure for these dimensions belongs to Area 16.

Countable units shall require whole quantities, while measured units may use the
decimal precision permitted for their base unit.

##### Reason

This deliberately reuses the condition-reclassification pattern in Area 7 /
DEC-003. Applying it to the independent loss dimension provides consistent
atomic history and accurate quantities without treating an entire holding as
missing or inventing individual identities.

#### DEC-011: Separate confirmed loss from write-off

- **Status:** Accepted
- **Area:** Condition, damage, loss, repair, and disposal
- **Builds on:** System-wide / SYS-001, Area 7 / DEC-008,
  Area 7 / DEC-009, Area 7 / DEC-010

Changing stock to `CONFIRMED_LOST` shall establish its physical loss status but
shall not automatically write it off.

A write-off shall be a separate, explicitly authorized, append-only transaction
linked to the loss case and affected inventory unit or quantity. Until that
transaction is completed, confirmed-lost stock shall remain visibly recorded as
awaiting its applicable administrative or financial resolution.

A completed write-off shall remove the affected stock from current active
accountable inventory without deleting:

- the inventory unit or quantity history;
- its catalogue relationship;
- its condition and movement histories;
- the loss case;
- its recorded values; or
- the write-off authorization and event.

The write-off shall not rewrite or replace `CONFIRMED_LOST`; loss status and
write-off status answer different questions.

If written-off stock is later recovered, the recovery event required by Area 7 /
DEC-008 shall return its current physical loss status to `PRESENT`, but shall
not silently return it to active accountable inventory. Reactivation shall
require a separate authorized reinstatement transaction linked to the recovery
and original write-off.

Write-off and reinstatement roles, approvals, and evidence requirements are
defined in Area 10 / DEC-013. Their valuation and financial-reporting effects
belong to Area 8.

##### Reason

Confirmation of physical loss and authorization to remove stock from active
accounts are different decisions and may belong to different officers. Keeping
them separate prevents an investigation outcome from bypassing administrative
or financial control and allows later recovery to be handled without rewriting
history.

#### DEC-012: Separate physical disposal from write-off

- **Status:** Accepted
- **Area:** Condition, damage, loss, repair, and disposal
- **Builds on:** System-wide / SYS-001, Area 7 / DEC-001,
  Area 7 / DEC-007, Area 7 / DEC-011

Physical disposal and write-off shall be separate, append-only business
transactions.

- **Write-off** records the authorized administrative or financial removal of
  stock from current active accountable inventory.
- **Disposal** records what physically happened to stock when it was scrapped,
  destroyed, sold, donated, transferred outside the institute, or otherwise
  permanently removed through an approved method.

When both concern the same inventory unit or quantity, the transactions shall be
linked, but neither shall silently create, approve, complete, backdate, or
overwrite the other.

The system shall represent and report outstanding combinations explicitly,
including:

- written off but still physically held pending disposal; and
- physically disposed but with write-off still outstanding.

A completed disposal shall preserve the inventory record, its last institute
location, holder, custodial organizational unit, condition, value, and complete
transaction history. It shall not delete the stock or conceal the officers,
method, date, quantity, evidence, or approvals involved.

The permitted disposal methods and sequencing rules are defined by the
subsequent Area 7 decisions. Role, approval, and evidence responsibilities are
defined in Area 10 / DEC-011 and DEC-013. Financial effects remain within
Area 8.

##### Reason

An accounting decision and a physical event may occur at different times and
require different evidence or officers. Preserving both prevents stock awaiting
disposal from disappearing from physical accountability and makes incomplete
administrative follow-up visible.

#### DEC-013: Require write-off before normal physical disposal

- **Status:** Accepted
- **Area:** Condition, damage, loss, repair, and disposal
- **Builds on:** System-wide / SYS-001, Area 5 / DEC-004,
  Area 7 / DEC-011, Area 7 / DEC-012

Normal planned disposal shall follow this sequence:

```text
write-off completed
  → disposal separately authorized
  → physical disposal completed
```

The system shall not permit ordinary completion of physical disposal until the
affected inventory unit or exact quantity has a completed write-off and a
separate disposal authorization.

A controlled exceptional path may record physical disposal without a prior
completed write-off only for circumstances such as:

- emergency destruction required for safety;
- stock already disposed of before the event could be entered; or
- historical disposal discovered during later reconciliation.

The exceptional path shall require:

- an explicit exception reason;
- supporting evidence;
- an authorized exception decision;
- the exact affected inventory unit or quantity;
- the actual physical-disposal date when known;
- the immutable system actor and system-recording time; and
- a visible outstanding-write-off flag until the separate write-off is
  completed.

The actual physical-disposal date shall not replace or backdate the
system-recording time. Completing exceptional disposal shall not silently create
or approve the outstanding write-off.

Both normal and exceptional completion shall use locked validation and one
atomic append-only transaction so stock cannot be disposed twice or in excess of
the eligible quantity.

The Stock-proposal, Finance-authorization, and Store-completion allocation is
defined in Area 10 / DEC-011 and DEC-013. Any institution-specific evidence
threshold remains a deployment-policy confirmation rather than an unresolved
role-design decision.

##### Reason

Physical disposal is difficult or impossible to reverse. Requiring write-off
and separate disposal authorization protects accountable stock, while a tightly
controlled exception allows the system to record emergencies and historical
reality without falsifying dates or hiding incomplete administration.

#### DEC-014: Use a controlled disposal lifecycle

- **Status:** Accepted
- **Area:** Condition, damage, loss, repair, and disposal
- **Builds on:** System-wide / SYS-001, Area 7 / DEC-012,
  Area 7 / DEC-013

Normal disposal shall use this lifecycle:

```text
PENDING_APPROVAL
  → APPROVED_AWAITING_DISPOSAL
  → COMPLETED
```

The states mean:

- `PENDING_APPROVAL`: disposal has been proposed but is not authorized.
- `APPROVED_AWAITING_DISPOSAL`: authorization is complete, but physical
  disposal has not yet been confirmed.
- `COMPLETED`: the authorized physical disposal and its required evidence have
  been recorded.
- `REJECTED`: the proposal was refused before authorization.
- `CANCELLED`: an approved disposal was stopped before physical disposal.

`REJECTED`, `CANCELLED`, and `COMPLETED` are terminal for that disposal
transaction. A later attempt shall create a new linked disposal proposal.

For the controlled exceptional path in Area 7 / DEC-013, the system shall still
preserve separate proposal, exception-approval, and completion events. Because
the physical event has already occurred, approval may record completion in the
same atomic business transaction without falsely claiming that stock is still
awaiting disposal.

Every transition shall be an append-only event retaining its actor, time,
reason, and required evidence. The displayed current state may be a projection
of those events.

After `COMPLETED`, the transaction shall not be cancelled or returned to an
earlier state. An error shall use a linked append-only correction or
compensating transaction under System-wide / SYS-001.

##### Reason

Authorization and physical disposal are separate facts. The lifecycle makes
their gap visible, prevents disposal before approval in the ordinary workflow,
and avoids pretending that an irreversible completed event can be undone by
editing a state field.

#### DEC-015: Keep repair separate from movement and functional condition

- **Status:** Accepted
- **Area:** Condition, damage, loss, repair, and disposal
- **Builds on:** System-wide / SYS-001, Area 3 / DEC-010,
  Area 6 / DEC-002, Area 6 / DEC-006, Area 7 / DEC-001,
  Area 7 / DEC-002, Area 7 / DEC-007

A repair shall be recorded as its own append-only business process. Its case
shall record the affected inventory unit or quantity, reported problem,
diagnosis, work performed, repairer, relevant dates, supporting evidence, and
outcome as applicable.

Creating or progressing a repair case shall not silently change:

- physical location;
- custodial organizational unit;
- current holder;
- movement state;
- functional condition;
- damage-case state; or
- loss status.

On-site repair requires no invented movement. When stock is physically handed
to an off-site repairer, the system shall use an explicit possession handover
and physical-location change under the Area 3 and Area 6 rules. The institute's
custodial organizational unit shall remain unchanged unless a custody transfer
is separately and explicitly authorized.

Completing repair shall not automatically classify the stock as `WORKING`. It
shall require an explicit post-repair functional-condition assessment. The
repair completion and assessment may be committed atomically as linked events,
but both facts shall remain distinguishable in the audit history.

A repair case may be linked to a damage report without editing, replacing, or
automatically resolving that damage report. Any damage-case resolution shall
remain an explicit linked event under Area 7 / DEC-007.

##### Reason

Repair, physical handover, accountability, and observed condition are different
facts. Separating them supports on-site and external work, preserves the chain
of custody, and avoids assuming that completed work was successful or resolved
every related incident.

#### DEC-016: Allow repair cases to have independent origins

- **Status:** Accepted
- **Area:** Condition, damage, loss, repair, and disposal
- **Builds on:** Area 7 / DEC-002, Area 7 / DEC-007,
  Area 7 / DEC-015

A repair case shall not require a damage report when no physical damage was
reported.

Every repair case shall record one explicit origin type:

- `DAMAGE_REPORT`;
- `FUNCTIONAL_FAULT`;
- `PREVENTIVE_MAINTENANCE`;
- `INSPECTION_FINDING`; or
- `OTHER`, with a required explanation.

When the origin is an existing system record, such as a damage report or
inspection finding, the repair case shall link to that record. When the origin
is a newly observed functional fault, maintenance need, or other reason, the
case shall preserve its own reported details, actor, and time.

Opening a repair case from one origin shall not silently create a record in
another. In particular, the system shall not create a false physical-damage
report merely to satisfy repair workflow.

The origin type shall describe why the repair process began; it shall not
predetermine the diagnosis, repair outcome, or post-repair functional condition.

##### Reason

Stock may require work because of an internal fault, preventive service, or an
inspection finding without having physical damage. Requiring a damage report in
all cases would corrupt the incident history and make reports unreliable.

#### DEC-017: Apply the under-repair restriction only when repair begins

- **Status:** Accepted
- **Area:** Condition, damage, loss, repair, and disposal
- **Builds on:** Area 7 / DEC-001, Area 7 / DEC-006,
  Area 7 / DEC-015, Area 7 / DEC-016

Opening a repair case shall not by itself classify stock as `UNDER_REPAIR`.

When repair actually begins, an explicit append-only repair event shall apply
the `UNDER_REPAIR` operational-availability restriction to the exact affected
inventory unit or quantity.

While that restriction is active:

- ordinary issue, loan, and transfer shall be blocked;
- repair-related possession handover, location movement, return, inspection,
  and disposal may proceed through their controlled workflows; and
- current location, custodial organizational unit, current holder, functional
  condition, damage status, and loss status shall remain independent.

Ending the repair shall require the explicit post-repair functional-condition
assessment in Area 7 / DEC-015. The repair-ending transaction may then remove
the `UNDER_REPAIR` restriction atomically with that assessment.

Removing `UNDER_REPAIR` shall remove only the restriction created by the repair
case. It shall not override quarantine, reservation, in-transit, missing,
confirmed-loss, write-off, disposal, or any other restriction.

Every application and removal of the restriction shall retain the repair case,
affected unit or quantity, actor, and system-recording time.

##### Reason

A repair request may wait for diagnosis, approval, parts, or scheduling while
the stock remains in use. Applying the restriction only when work begins
represents reality, while independent restrictions prevent repair completion
from making otherwise ineligible stock available.

#### DEC-018: Use immutable repair lifecycles and completion outcomes

- **Status:** Accepted
- **Area:** Condition, damage, loss, repair, and disposal
- **Builds on:** System-wide / SYS-001, Area 7 / DEC-004,
  Area 7 / DEC-015, Area 7 / DEC-017

A repair case shall use this lifecycle:

```text
OPEN → IN_REPAIR → COMPLETED
```

`OPEN → CANCELLED` shall be permitted only before repair work begins.

The states mean:

- `OPEN`: the repair case exists, but work has not begun;
- `IN_REPAIR`: work has begun and the Area 7 / DEC-017 availability
  restriction is active;
- `COMPLETED`: the repair attempt has ended and its outcome and post-repair
  assessment have been recorded; and
- `CANCELLED`: the proposed repair was stopped before any work began.

Once work enters `IN_REPAIR`, it shall not be cancelled. If the attempt ends
without achieving its objective, it shall still become `COMPLETED` with an
unsuccessful outcome.

Every completed repair of an individually tracked inventory unit, and every
outcome allocation in a quantity-tracked repair, shall record one controlled
completion outcome:

- `SUCCESSFUL`: the stated repair objective was achieved; or
- `UNSUCCESSFUL`: the stated repair objective was not achieved.

The completion outcome shall remain separate from the required post-repair
functional condition:

- `WORKING`;
- `PARTIALLY_WORKING`;
- `NOT_WORKING`; or
- `UNKNOWN`.

`Unrepairable` shall not be another repair lifecycle state. It shall be recorded
as the required reason or remarks explaining an `UNSUCCESSFUL` outcome.

The terminal lifecycle state and completion outcome shall be immutable. They
shall not be switched, reopened, or overwritten. A recording error shall use a
linked append-only correction under System-wide / SYS-001 while preserving the
original entry.

A second opinion or later attempt shall create a fresh repair case linked to the
previous completed case. It shall proceed through its own lifecycle, outcome,
evidence, and post-repair assessment without altering the first repair's
history.

##### Reason

Lifecycle state answers where the repair process is, completion outcome answers
whether its stated objective succeeded, and functional condition records the
observed result. Keeping all three immutable and separate prevents
contradictions while supporting auditable unsuccessful attempts and later
second opinions.

#### DEC-019: Allocate quantity-tracked repair outcomes exactly

- **Status:** Accepted
- **Area:** Condition, damage, loss, repair, and disposal
- **Builds on:** Area 1 / DEC-007, Area 7 / DEC-003,
  Area 7 / DEC-017, Area 7 / DEC-018

A repair of quantity-tracked stock shall identify and lock the exact affected
holding and repair quantity.

At completion, the system shall allocate the full repair quantity between:

- `SUCCESSFUL`; and
- `UNSUCCESSFUL`.

Each outcome allocation shall also record its exact post-repair functional
condition. For example, a repair of 10 chairs may complete with:

- 6 `SUCCESSFUL` with post-repair condition `WORKING`; and
- 4 `UNSUCCESSFUL` with post-repair condition `NOT_WORKING`.

Outcome-allocation quantities shall:

1. use whole numbers for countable units and the permitted decimal precision
   for measured units;
2. be greater than zero;
3. contain no overlapping quantity; and
4. sum exactly to the quantity placed under that repair case.

Progress events may be recorded while work continues, but they shall not remove
the `UNDER_REPAIR` restriction or prematurely finalize an outcome allocation.
The grouped repair shall remain `IN_REPAIR` until every affected quantity has a
completion outcome and post-repair functional condition.

Completion shall atomically:

1. validate the full outcome allocation;
2. create its immutable outcome and condition events;
3. reclassify the applicable condition balances;
4. remove the repair restriction from the completed quantity; and
5. move the repair case to `COMPLETED`.

Other availability or loss restrictions shall remain unaffected. A second
opinion or later repair of an unsuccessful quantity shall use a fresh linked
repair case for that exact quantity.

##### Reason

A grouped repair may produce mixed results without the stock having individual
identities. Exact outcome allocations preserve the binary result model for each
quantity portion, keep condition balances accurate, and prevent stock from
disappearing or being counted twice.

#### DEC-020: Treat replacement as distinct new stock

- **Status:** Accepted
- **Area:** Condition, damage, loss, repair, and disposal
- **Builds on:** System-wide / SYS-001, Area 1 / DEC-002,
  Area 1 / DEC-013, Area 2 / DEC-003, Area 5 / DEC-001,
  Area 7 / DEC-007, Area 7 / DEC-008, Area 7 / DEC-018

Stock obtained as a replacement shall be created and treated as distinct new
stock under the Area 5 intake rules.

Even when physically and functionally identical, a replacement shall have its
own:

- permanent inventory identity when individually tracked;
- creation provenance and creator;
- initial functional condition;
- value record;
- physical location, custodial organizational unit, and current holder as
  applicable; and
- complete lifecycle and audit history.

The replacement shall not inherit the old stock's inventory code, asset number,
serial number, condition, damage, loss, repair, movement, custody, possession,
write-off, or disposal state or history.

An append-only `REPLACEMENT_FOR` link may connect the new stock-creation record
to the previous inventory unit or quantity and the incident that caused the
replacement. The link shall provide historical and reporting context only. It
shall not:

- create an attachment, component, composite, installed-in, or union-product
  relationship;
- cascade movement, custody, possession, location, condition, or status; or
- imply that the new and old stock are one identity.

For quantity-tracked stock, replacement shall be a new stock addition. It shall
not be recorded as recovery of the damaged, lost, written-off, or disposed
quantity.

##### Reason

A replacement is a new physical and accountability fact rather than a
continuation of the old stock. Reusing the previous record would incorrectly
transfer history—especially loss, write-off, or disposal status—to stock that
did not experience those events.

#### DEC-021: Record functional condition through explicit assessments

- **Status:** Accepted
- **Area:** Condition, damage, loss, repair, and disposal
- **Builds on:** System-wide / SYS-001, Area 3 / DEC-010,
  Area 7 / DEC-003, Area 7 / DEC-004, Area 7 / DEC-015

Every functional-condition change after stock creation shall originate from an
explicit condition-assessment record.

Each assessment shall record:

- the exact inventory unit or affected quantity;
- the previously effective functional condition;
- the newly observed functional condition;
- the physical inspector;
- the system actor who recorded the assessment;
- the inspection time and immutable system-recording time;
- the assessment reason and remarks;
- required supporting evidence under institute policy; and
- a snapshot of physical location, current holder, and custodial organizational
  unit at the inspection time.

The physical inspector and system actor may be different people. Recording a
snapshot shall preserve historical context and shall not change location,
possession, or custody.

An assessment may confirm that functional condition remains unchanged. Such an
assessment shall remain meaningful inspection evidence even though it creates no
condition-balance reclassification.

For an individually tracked inventory unit, the current functional-condition
view shall be derived from its latest effective assessment.

For quantity-tracked stock, a condition-changing assessment shall use the
locked, atomic reclassification required by Area 7 / DEC-003. A no-change
assessment shall validate and record the exact inspected quantity without
moving it between condition balances.

Assessments and corrections shall remain append-only. An erroneous assessment
shall use a linked corrective assessment under System-wide / SYS-001 rather than
being edited or deleted.

##### Reason

Condition is an observation made at a particular time, not an unexplained
mutable label. Explicit assessments show who inspected what and in which
accountability context, while unchanged assessments provide positive evidence
for stock-taking and audit.

#### DEC-022: Resolve quantity-based damage through exact outcome allocations

- **Status:** Accepted
- **Area:** Condition, damage, loss, repair, and disposal
- **Builds on:** System-wide / SYS-001, Area 7 / DEC-003,
  Area 7 / DEC-007, Area 7 / DEC-014, Area 7 / DEC-019

A damage case affecting quantity-tracked stock may be resolved through multiple
append-only outcome allocations.

Each resolution allocation shall identify:

- the exact damage case;
- the exact affected quantity;
- the completed business outcome, such as repaired, accepted with damage, or
  disposed; and
- the explicit completed source transaction or authorized resolution decision.

Resolution quantities shall not overlap, exceed the unresolved quantity, or
refer ambiguously to stock merely because it belongs to the same catalogue item
or holding.

Approval or intended action alone shall not resolve a quantity. For example,
`APPROVED_AWAITING_DISPOSAL` leaves the affected damage quantity unresolved.
Only `COMPLETED` disposal may create its linked `DISPOSED` damage-resolution
allocation.

Completing a linked repair, disposal, or other resolution shall use one locked,
atomic transaction to:

1. validate the source transaction and its explicitly selected damage-resolution
   target;
2. append the source completion event;
3. append the exact damage-resolution allocation;
4. reconcile total resolved quantity against the damage case's affected
   quantity; and
5. append a damage-case `RESOLVED` event when all affected quantity is
   accounted for.

The damage case shall remain `OPEN` while any affected quantity remains
unresolved. Its displayed current status may be a projection, but the
authoritative facts shall be the preserved resolution allocations and case
events.

The system shall not infer a damage resolution merely because the same stock
participated in a repair or disposal. The source transaction must explicitly
identify the damage case and quantity it resolves.

##### Reason

An affected quantity may reach different outcomes at different times. Exact,
explicit allocations prevent double resolution and ensure a downstream process
closes only the intended damage case rather than whichever case happens to
reference the same stock.

#### DEC-023: Allow multiple damage cases but prevent overlapping active repairs

- **Status:** Accepted
- **Area:** Condition, damage, loss, repair, and disposal
- **Builds on:** Area 7 / DEC-006, Area 7 / DEC-007,
  Area 7 / DEC-017, Area 7 / DEC-019, Area 7 / DEC-022

An inventory unit or affected quantity may have multiple open damage cases for
separate incidents or faults. Each case shall preserve its own reporter,
evidence, interim-use disposition, and resolution history.

One repair case may explicitly select and address multiple damage cases. Its
completion shall resolve only the selected cases and quantities for which it
records completed outcomes.

Only one repair case may be `IN_REPAIR` for an individually tracked inventory
unit at a time. Other repair proposals may remain `OPEN`, but shall not begin
until the active repair ends.

For quantity-tracked stock:

- an active repair shall reserve its exact affected quantity;
- active repair allocations shall not overlap or together exceed the eligible
  quantity;
- when the same quantity has issues A and B, one repair allocation shall reserve
  that quantity once and may link both damage cases; and
- two repairs may proceed concurrently only against separately available,
  non-overlapping quantity allocations.

For example, if the same five chairs have two reported issues and one repairer
will address both, the repair shall reserve five chairs once and select both
damage cases. The system shall not create two five-chair reservations for the
same physical group.

Ending one damage or repair case shall remove only the availability restriction
that case imposed. Stock shall remain restricted while any other applicable
case continues to impose quarantine or `UNDER_REPAIR`.

##### Reason

Separate damage cases preserve distinct incident history, while explicit
multi-case repair selection supports one repairer handling several faults.
Non-overlapping repair allocations prevent the same unit or quantity from being
simultaneously counted under incompatible physical repair processes.

#### DEC-024: Resolve missing or lost stock explicitly during transit

- **Status:** Accepted
- **Area:** Condition, damage, loss, repair, and disposal
- **Builds on:** Area 6 / DEC-004, Area 6 / DEC-006,
  Area 7 / DEC-008, Area 7 / DEC-009, Area 7 / DEC-010,
  Area 7 / DEC-011

When stock is reported missing after source release but before destination
receipt:

1. the affected movement line or quantity shall remain `IN_TRANSIT`;
2. a missing case shall be opened for that exact inventory unit or quantity;
3. no destination balance, current-holder assignment, custody transfer, or
   receipt shall be fabricated; and
4. the movement discrepancy and loss case shall remain explicitly linked.

If the stock is recovered, the append-only recovery process shall complete
before the destination performs normal receipt. The receipt shall then apply
only the quantity physically confirmed.

If the stock becomes `CONFIRMED_LOST`, a separately authorized append-only
loss-resolution event may resolve the affected in-transit movement line as lost.
That resolution shall:

- create no destination inventory balance;
- apply no unconfirmed destination holder, custody, or location change;
- preserve the source release, intended destination, discrepancy, investigation,
  and loss history; and
- leave write-off as the separate decision required by Area 7 / DEC-011.

For a partially received quantity, the received portion may complete normally
while only the missing portion remains `IN_TRANSIT`. The overall movement shall
become `COMPLETED` only after every released line or quantity has either been
received or explicitly resolved through an authorized outcome.

`COMPLETED` in this situation means that the movement has no unresolved
in-transit quantity; it does not claim that confirmed-lost stock was received.

##### Reason

Leaving the movement in transit during investigation preserves the chain of
custody and prevents premature conclusions. Explicit lost-in-transit resolution
eventually closes the operational movement without inventing destination stock
or obscuring where the loss occurred.

#### DEC-025: Require recipient confirmation and checks for recovered stock

- **Status:** Accepted
- **Area:** Condition, damage, loss, repair, and disposal
- **Builds on:** Area 3 / DEC-010, Area 6 / DEC-004,
  Area 7 / DEC-001, Area 7 / DEC-008, Area 7 / DEC-011,
  Area 7 / DEC-021, Area 7 / DEC-024

A report that stock has been found shall not by itself change its current loss
status to `PRESENT`.

Recovery shall require confirmation by the authorized party physically
receiving the recovered stock:

- for stock recovered during an in-transit movement, the intended destination
  recipient or their authorized representative; or
- outside a movement, an authorized receiving officer for the custodial
  organizational unit taking physical receipt.

The permissions and segregation between finder, recorder, and recovery
confirmer are defined in Area 10 / DEC-011.

Recovery confirmation shall:

1. verify the inventory identity or exact quantity;
2. record actual physical receipt;
3. confirm the resulting physical location, current holder, and custodial
   organizational unit;
4. change current loss status to `PRESENT`;
5. create the append-only `RECOVERED` event required by Area 7 / DEC-008; and
6. apply a temporary `RECOVERY_HOLD`.

For an in-transit recovery, the recovery and destination-receipt events may be
committed in one atomic transaction while remaining distinguishable audit
facts.

Before `RECOVERY_HOLD` is removed, the stock shall receive the explicit
functional-condition assessment required by Area 7 / DEC-021. Written-off stock
shall additionally require the reinstatement transaction in Area 7 / DEC-011.

Loss status, functional condition, damage, quarantine, repair, write-off,
disposal, and other availability restrictions remain independent. Removing
`RECOVERY_HOLD` shall not remove or override any other applicable restriction.

##### Reason

Recipient confirmation prevents a finder or recorder from unilaterally claiming
that missing stock has returned to accountable possession. The recovery hold
permits identity, accountability, and condition checks while preserving
simultaneous facts such as damage, quarantine, or write-off.

#### DEC-026: Preserve the loss lifecycle during validated late entry

- **Status:** Accepted
- **Area:** Condition, damage, loss, repair, and disposal
- **Builds on:** System-wide / SYS-001, Area 5 / DEC-004,
  Area 7 / DEC-008, Area 7 / DEC-009

When a valid institutional loss investigation and confirmation occurred outside
the system before they could be entered, the system may record them through a
controlled late-entry transaction.

The transaction shall atomically create linked:

1. `MISSING_UNDER_INVESTIGATION`; and
2. `CONFIRMED_LOST`

events rather than bypass the established loss lifecycle or require an
artificial waiting period.

Each event shall preserve its actual occurrence or decision date where known.
Both shall also retain the later, immutable system-recording time, recording
actor, late-entry reason, supporting evidence, and officer who validated the
offline process.

Late entry shall not permit a user to declare stock already confirmed lost
without valid institutional evidence and authorization. The validation and
person-separation rules are defined in Area 10 / DEC-011; the institute may
confirm which offline evidence references it accepts.

##### Reason

An investigation may occur during an outage, through an approved offline
process, or before an authorized officer enters it. Preserving both event dates
and recording time reflects what happened without falsifying punctual entry or
breaking the consistent loss lifecycle.

### Area 8 — Valuation and Financial Information

#### DEC-001: Record exact KES intake valuations without overwriting them

- **Status:** Accepted
- **Area:** Valuation and financial information
- **Builds on:** System-wide / SYS-001, Area 1 / DEC-004,
  Area 1 / DEC-006, Area 5 / DEC-001, Area 5 / DEC-004

Every active stock-creation transaction shall create an original valuation
record or explicitly record that the value is unknown.

A known original valuation shall record one controlled basis:

- `ACQUISITION_COST`;
- `OPENING_DECLARED_VALUE`;
- `DONATION_GRANT_VALUE`;
- `EXTERNAL_TRANSFER_VALUE`; or
- `OTHER`, with a required explanation.

Creation provenance and valuation basis shall remain separate even when they are
related. The system shall not infer a monetary basis merely from the stock's
source type.

The institute's single base currency shall be Kenyan shillings (`KES`). Monetary
amounts shall be persisted as integer minor units:

```text
KES 1.00 = 100 minor units
```

Database monetary columns shall therefore store values such as `125050` for
`KES 1,250.50`. Conversion at server or user-interface boundaries shall use
exact decimal handling rather than binary floating-point arithmetic. Input with
unsupported fractional precision shall not be silently rounded.

For quantity-tracked stock:

- the total intake value shall be authoritative;
- the per-base-unit rate shall be derived from total value and quantity; and
- rounding a displayed unit rate shall never change the authoritative total.

For individually tracked stock, value shall belong to each inventory unit. A
batch form may apply a shared unit value or allow row-level overrides, while
preserving each unit's own valuation record.

An unknown value shall not be stored as zero. It shall use an explicit
`UNKNOWN` valuation status, a required reason, and a visible follow-up flag.
Zero shall remain a known monetary amount only when explicitly entered and
justified.

Later book, estimated, replacement, depreciated, corrected, or revalued amounts
shall be separate append-only valuation records. They shall not overwrite the
original valuation.

##### Reason

Stock may enter through acquisition, opening capture, donation, or transfer, so
one field labelled purchase price would misstate its source. Integer KES minor
units preserve exact monetary totals, while separate valuation records maintain
the original fact and every later financial interpretation.

#### DEC-002: Separate acquisition, valuation-effective, and recording dates

- **Status:** Accepted
- **Area:** Valuation and financial information
- **Builds on:** System-wide / SYS-001, Area 4 / DEC-007,
  Area 5 / DEC-004, Area 8 / DEC-001

The system shall represent three independent time concepts:

- **Acquisition date:** when the institute obtained the stock.
- **Valuation-effective date:** when a monetary valuation applies.
- **System-recording time:** when the system persisted the record.

Acquisition date shall belong to the created inventory unit or quantity
addition rather than its catalogue item. Historical acquisition information
shall support these explicit precision levels:

- exact date;
- month and year;
- year only; and
- `UNKNOWN`.

The system shall preserve the selected precision and shall not convert a partial
or unknown acquisition date into an invented exact date. Batch entry may apply
shared acquisition information with individual-row overrides where applicable.

Every valuation record shall require an exact `valuation_effective_on` calendar
date. Its system boundary representation shall use ISO `YYYY-MM-DD`; the
physical database type remains an Area 16 decision.

Every acquisition and valuation record shall also receive an automatic,
immutable `recorded_at` timestamp and recording actor. An actual or effective
date shall never replace or backdate that system timestamp.

The system shall distinguish:

- **Correction:** the earlier valuation was recorded incorrectly. A linked
  correcting valuation supersedes it for the applicable effective date while
  preserving both records and the correction reason.
- **Revaluation:** the stock's value genuinely changed later. A new valuation
  with its own later effective date is appended without treating the earlier
  value as an error.

Current and as-of-date valuation views may be projections of the applicable
effective records, but every source valuation, correction, and revaluation shall
remain retrievable.

##### Reason

Acquisition, financial effect, and data entry may occur at different times.
Separating them supports honest partial historical dates, prevents backdating
from concealing delayed entry, and distinguishes correction of a mistake from a
genuine later change in value.

#### DEC-003: Keep stock valuation separate from full financial accounting

- **Status:** Accepted
- **Area:** Valuation and financial information
- **Builds on:** System-wide / SYS-001, Area 7 / DEC-011,
  Area 7 / DEC-012, Area 8 / DEC-001, Area 8 / DEC-002

The system shall act as a stock-valuation ledger, not as the institute's full
accounting system.

Later valuation records may use these distinct valuation types:

- `BOOK_VALUE`;
- `ESTIMATED_CURRENT_VALUE`; and
- `REPLACEMENT_VALUE`.

These values answer different questions and shall not silently replace one
another. The system shall not calculate depreciation automatically unless the
institute later supplies and approves a depreciation policy.

Damage, missing status, confirmed loss, repair, and physical disposal shall not
automatically alter a stock valuation. A completed write-off shall instead
record the exact KES amount written off in a separate append-only transaction.
That amount shall be excluded from active-value reports while the original and
later valuation records remain preserved.

A partial write-off of quantity-tracked stock shall require an explicit KES
value allocation. The system shall not silently derive the written-off amount
from quantity because the authoritative total may not divide evenly and units
may not have equal financial value.

If a write-off must later be reinstated, the system shall append a linked
value-restoration transaction. It shall not delete, reverse in place, or rewrite
the original write-off.

Repair costs and disposal proceeds may reference identifiers from external
financial records, but the stock system shall not automatically add repair
costs to a stock valuation or subtract disposal proceeds from it.

##### Reason

Physical status and financial treatment are related but not equivalent:
damaged stock is not automatically worth zero, and confirmed loss is not
automatically a write-off. Keeping explicit, linked financial events prevents
operational actions from silently changing reported value while leaving room
for the institute's accounting processes and future policies.

#### DEC-004: Pool quantity-stock value using a moving weighted average

- **Status:** Accepted
- **Area:** Valuation and financial information
- **Builds on:** System-wide / SYS-001, Area 1 / DEC-004,
  Area 1 / DEC-006, Area 6 / DEC-003, Area 6 / DEC-007,
  Area 8 / DEC-001, Area 8 / DEC-003

Each active quantity balance shall maintain an authoritative total quantity, an
authoritative known KES value, and a valuation-completeness status. A fully
valued balance has an authoritative total KES value. Different additions to the
same balance shall be pooled rather than requiring users to identify which
physically indistinguishable intake batch supplied a later transaction.

The balance's displayed unit rate shall be a derived moving weighted average:

```text
derived unit rate = authoritative active value / authoritative active quantity
```

The system shall apply these allocation rules atomically:

- a valued stock addition increases the receiving balance by its exact quantity
  and exact intake value;
- a transfer reduces the source by the transferred quantity and its
  proportionally allocated value, then adds both to the destination without
  changing institute-wide value;
- a completed consumable issue removes its quantity and allocated value from
  active stock;
- a full return restores the exact quantity and value carried by its original
  transaction; and
- a partial return proportionally divides the original transaction's own
  quantity and value rather than recalculating it from an unrelated current
  balance.

Partial write-offs remain governed by Area 8 / DEC-003: their KES allocation
must be explicitly authorized rather than silently calculated from quantity.

All proportional calculations shall use exact decimal arithmetic and persist
money as integer KES minor units. When a proportional allocation produces a
fraction of a cent, the system shall apply one documented deterministic
rounding rule and retain the residual cent value in the source balance. A
transaction that finally depletes that source balance shall take all remaining
minor units so that no value is stranded.

Every value allocation shall be linked to the stock transaction that caused
it. The original intake valuations shall remain preserved even though the
current active balance is valued as a pool.

##### Reason

Users may be unable to distinguish physically identical stock received at
different values. Pooling preserves the exact aggregate quantity and value
without inventing item-level cost identities. Atomic quantity-and-value updates
provide immediate aggregate consistency, while transaction links and preserved
intake records retain the audit trail.

#### DEC-005: Preserve incomplete valuation and control later financial entries

- **Status:** Accepted
- **Area:** Valuation and financial information
- **Builds on:** System-wide / SYS-001, Area 8 / DEC-001,
  Area 8 / DEC-002, Area 8 / DEC-003, Area 8 / DEC-004

A quantity balance containing both known-valued and unknown-valued stock shall
remain operationally usable but shall be reported as `PARTIALLY_VALUED`. It
shall expose:

- its authoritative total quantity;
- its known KES subtotal;
- its unvalued quantity; and
- its incomplete valuation status.

The system shall not present that known subtotal as the complete balance value
or display a complete weighted-average rate while any part remains unvalued.
A wholly unvalued balance shall be reported as `UNVALUED`; a balance with no
unresolved value shall be `FULLY_VALUED`.

Supplying a previously unknown value shall create a linked, append-only
first-known valuation. It is neither a correction, because no earlier known
amount was wrong, nor a revaluation, because it does not by itself assert that
the stock's value changed. The original `UNKNOWN` record shall remain and shall
show which first-known valuation resolved it.

Authorized users may enter a valuation with an earlier effective date, but the
entry shall require a reason. Its effective date shall control applicable
financial projections, while its immutable actor and `recorded_at` timestamp
shall expose when it was actually entered. Linked balance and allocation
projections may be recalculated from preserved source events; persisted
transactions and valuation history shall not be rewritten.

Financial transaction amounts shall be entered as positive KES minor-unit
amounts. Within one atomic transaction, the system shall lock and validate the
relevant current financial balance before appending the event. In particular:

- a write-off shall not exceed the eligible active value;
- a restoration shall reference a write-off and shall not exceed that
  write-off's unrestored amount; and
- a mistaken financial event shall be handled through a linked
  reversal/correction and replacement where necessary, not through deletion or
  a user-entered negative amount.

##### Reason

Unknown value is missing knowledge, not zero value. Showing valuation coverage
prevents a known subtotal or derived rate from being mistaken for a complete
valuation. Separate effective and recording times support legitimate late
entry without concealing it, while locked upper-bound checks prevent duplicate
or excessive write-offs and restorations.

#### DEC-006: Keep individual valuations exact and batch totals reconciled

- **Status:** Accepted
- **Area:** Valuation and financial information
- **Builds on:** System-wide / SYS-001, Area 1 / DEC-005,
  Area 2 / DEC-001, Area 5 / DEC-002, Area 8 / DEC-001,
  Area 8 / DEC-004, Area 8 / DEC-005

Each individually tracked inventory unit shall have its own authoritative
valuation status and valuation history.

An atomic batch-entry form may accept:

- one value to apply separately to every unit;
- one exact batch total to distribute among the units; or
- separately entered values for individual units.

When distributing a batch total, the system shall allocate every KES minor unit
using one documented deterministic rule and show the resulting unit
allocations before submission. Users may override individual allocations, but
the known unit values must reconcile exactly to the declared batch total. A
mismatch shall reject the complete atomic batch while retaining the submitted
form data for correction.

After creation, a batch total shall be a derived sum of its unit valuations,
not a second competing authoritative value. Every unit may independently be
valued or unvalued. Their aggregate view shall therefore report
`FULLY_VALUED`, `PARTIALLY_VALUED`, or `UNVALUED` and shall expose its known
subtotal and unvalued-unit count where applicable.

A batch revaluation of individually tracked stock shall atomically create a
separate linked valuation record for every explicitly selected unit. The batch
action may provide shared values and per-unit overrides, but shall not replace
unit-level valuation history with one inseparable batch value.

Quantity-tracked stock shall be revalued at the complete active-balance level.
The system shall not revalue an unidentified portion of an interchangeable
quantity pool. Partial write-off remains the explicit exception governed by
Area 8 / DEC-003. Revaluing multiple quantity balances shall require every
affected balance to be explicitly selected and shall append a valuation record
for each selected balance atomically.

##### Reason

Individually tracked stock requires unit-level financial truth, while
quantity-tracked stock relies on pooled value because its contents are
interchangeable. Exact reconciliation prevents batch totals and unit values
from drifting apart, and explicit revaluation scope preserves predictable,
auditable history.

### Area 9 — Physical Stock-Taking and Reconciliation

#### DEC-001: Use fixed, time-aware stock-take scopes without stopping operations

- **Status:** Accepted
- **Area:** Physical stock-taking and reconciliation
- **Builds on:** System-wide / SYS-001, Area 3 / DEC-005,
  Area 4 / DEC-001, Area 6 / DEC-003

Every stock-take exercise shall have a permanent human-readable reference code,
name, purpose, reporting period, activation actor, and exact activation
timestamp.

Its scope may be selected using one or more explicit inventory dimensions,
including:

- custodial organizational unit;
- physical location;
- category or catalogue item;
- stock type; and
- explicitly selected inventory units or quantity balances.

Activating the exercise shall preserve its scope and a baseline snapshot of the
stock expected within that scope. The activated scope shall not be edited in
place. A later inclusion or exclusion shall require an append-only amendment
that records the change, reason, actor, and timestamp.

Stock operations shall not be frozen while an exercise is active. Issues,
transfers, returns, additions, and other authorized transactions may continue.
Every submitted count shall therefore record an exact `counted_at` time. The
system shall derive what should have been present at that time from the
activation snapshot and the intervening append-only transaction history.

Operational changes after activation shall be shown separately in the
stock-take record. A legitimate intervening transaction shall adjust the
time-aware expected balance rather than appear as an unexplained physical
discrepancy.

##### Reason

Stopping stock activity for a stock take would be operationally restrictive,
especially when counting spans several days. A preserved baseline, fixed scope,
exact count times, and ledger-based adjustments allow work to continue without
letting later activity conceal discrepancies or silently change what the
exercise covers.

#### DEC-002: Use partially blind, immutable physical counts

- **Status:** Accepted
- **Area:** Physical stock-taking and reconciliation
- **Builds on:** System-wide / SYS-001, Area 1 / DEC-005,
  Area 2 / DEC-001, Area 3 / DEC-005, Area 7 / DEC-001,
  Area 9 / DEC-001

The first physical count shall be partially blind.

For quantity-tracked stock, the count interface shall identify the catalogue
item and base unit but shall hide the system's expected quantity until the
counter submits an observed quantity.

For individually tracked stock, the interface may show the inventory-unit
identifiers expected within the count assignment because each exact unit must
be verified. It shall not infer their presence. The counter shall explicitly
record each expected unit as:

- `PRESENT`; or
- `NOT_OBSERVED`.

The counter may also record an unexpected inventory unit observed during the
count. Doing so shall not automatically amend the exercise scope, move the
unit, or change its custody. It shall create an observation requiring later
reconciliation.

Each count shall capture the observed physical location and applicable
condition information alongside presence or quantity. An exception shall
require remarks; an ordinary observation matching expectations shall not.

Counters may save incomplete work as a draft. Submission shall record the
counter and exact `counted_at` time and shall make the submitted count
immutable. The system shall reveal the time-aware expected value and resulting
discrepancy only after submission.

A submitted mistake or challenged observation shall be addressed by a linked
recount. The original submission shall not be edited or deleted.

##### Reason

Hiding expected quantities reduces copying and confirmation bias. Exact unit
identifiers remain necessary for practical verification of individually
tracked stock, but explicit presence decisions prevent the checklist itself
from becoming assumed evidence. Immutable submissions and linked recounts
preserve what each counter actually reported.

#### DEC-003: Require independent recounts for exceptions

- **Status:** Accepted
- **Area:** Physical stock-taking and reconciliation
- **Builds on:** System-wide / SYS-001, Area 9 / DEC-001,
  Area 9 / DEC-002
- **Resolved by:** Area 10 / DEC-012 for counter, reviewer, custodian, and
  approval permissions

One assigned counter may perform the routine first count. The system shall
require a second independent count when the first count produces:

- a quantity or presence discrepancy;
- an unexpected inventory unit;
- an observed-location mismatch;
- an observed-condition mismatch; or
- a line selected for an audit spot-check.

The recount shall be performed by a different person. Until that person submits
the recount, the interface shall hide both the time-aware expected result and
the first counter's result. Submission shall preserve each counter's identity,
observation, remarks, and exact count time separately.

An assigned reviewer may sign off that a count assignment is complete but
shall not alter either counter's submitted observations. A stock-take exercise
shall not close while a mandatory recount or a discrepancy produced by the
counting workflow remains unresolved.

Stock-custodian counting and the counter/reviewer authority allocation are
defined in Area 10 / DEC-012 without weakening the independent-recount rule.

##### Reason

Requiring two counts for every ordinary line would double effort even where no
risk signal exists. Independent recounts for discrepancies, mismatches,
unexpected stock, and selected spot-checks concentrate verification where it
is useful. Keeping both submissions immutable prevents a reviewer or later
counter from replacing the original evidence.

#### DEC-004: Investigate discrepancies before changing stock records

- **Status:** Accepted
- **Area:** Physical stock-taking and reconciliation
- **Builds on:** System-wide / SYS-001, Area 7 / DEC-001,
  Area 7 / DEC-007, Area 7 / DEC-010, Area 7 / DEC-025,
  Area 9 / DEC-001, Area 9 / DEC-002, Area 9 / DEC-003

A confirmed stock-take discrepancy shall create an investigation case. The
physical observation itself shall not directly change a quantity balance,
inventory unit, location, holder, custody, condition, loss state, or any other
stock record.

The case shall preserve separately:

- the time-aware expected state;
- the first submitted observation;
- every linked recount;
- the calculated difference or mismatch; and
- each append-only investigation finding, including its actor, time, remarks,
  and supporting evidence.

An investigation may determine that the discrepancy:

- is explained by an existing legitimate transaction;
- resulted from a movement or intake that was not recorded;
- resulted from a counting error established through an authorized recount;
- identifies stock at a different location or with a different holder;
- requires a damage, missing, confirmed-loss, or recovery workflow from Area 7;
  or
- requires a separately approved reconciliation adjustment because the system
  balance is genuinely wrong.

The investigator shall select a controlled resolution type and link the case to
the applicable explanatory or corrective process. Unexpected stock and
observed location or condition mismatches shall follow the same investigation
pattern.

Adding a remark or selecting an intended resolution shall not itself mark the
case `RESOLVED`. Resolution shall be derived only after every required linked
transaction, workflow, or approved adjustment has completed. All original
observations and findings shall remain preserved after resolution.

##### Reason

A physical count reports what a counter observed; it does not establish why
the records differ. Separating observation, investigation, and corrective
action prevents an unverified count from silently moving stock, declaring a
loss, or rewriting a balance while retaining a complete evidential chain.

#### DEC-005: Use separately approved reconciliation adjustments only for proven record errors

- **Status:** Accepted
- **Area:** Physical stock-taking and reconciliation
- **Builds on:** System-wide / SYS-001, Area 5 / DEC-001,
  Area 5 / DEC-004, Area 7 / DEC-007, Area 7 / DEC-010,
  Area 8 / DEC-004, Area 8 / DEC-005, Area 9 / DEC-004
- **Resolved by:** Area 10 / DEC-012 for proposal and approval permissions

A reconciliation adjustment shall be available only after an investigation
establishes that the system record itself is wrong and no existing movement,
loss, recovery, condition, or other domain workflow represents the required
correction.

An adjustment proposal shall identify:

- the affected quantity balance;
- an explicit increase or decrease direction and positive quantity;
- the investigation and evidence supporting it;
- its reason and proposed effective date; and
- its quantity and financial effects.

The proposal and approval shall be separate recorded events. Their authorized
roles are defined in Area 10 / DEC-012, and an adjustment shall require
approval by someone other than its proposer.

Application shall lock and revalidate the affected current balance and append
the adjustment atomically. If intervening transactions have made the approved
proposal stale, the system shall not apply it. The proposal shall return for
recalculation and fresh approval.

For quantity-tracked stock:

- `RECONCILIATION_DECREASE` may correct a proven record overstatement and shall
  carry its applicable pooled value under Area 8;
- `RECONCILIATION_INCREASE` may correct a proven record understatement and
  shall require a known value or an explicit `UNKNOWN` valuation; and
- a physical loss shall use the established loss and write-off processes
  rather than a reconciliation decrease.

For individually tracked stock:

- an expected unit that is not observed shall proceed through investigation
  and, where applicable, the missing/loss workflow rather than deletion;
- location, holder, custody, and condition mismatches shall use their existing
  controlled workflows;
- genuinely unregistered stock found during counting shall enter through the
  stock-creation process with `STOCK_TAKE_DISCOVERY` provenance; and
- a unit created in error shall use the established append-only correction
  process.

##### Reason

A general-purpose adjustment control could bypass most of the system's audit
rules. Restricting reconciliation to proven record errors preserves the
meaning of loss, movement, condition, and intake records. Separate approval
and atomic stale-state validation prevent an old proposal from overwriting
legitimate activity that occurred while the stock take continued.

#### DEC-006: Finalize completed stock-take exercises into immutable history

- **Status:** Accepted
- **Area:** Physical stock-taking and reconciliation
- **Builds on:** System-wide / SYS-001, Area 9 / DEC-001,
  Area 9 / DEC-002, Area 9 / DEC-003, Area 9 / DEC-004,
  Area 9 / DEC-005
- **Resolved by:** Area 10 / DEC-012 for final-review permission
- **Defers to:** Area 11 for detailed report layouts

A stock-take exercise shall use this controlled lifecycle:

```text
DRAFT -> ACTIVE -> RECONCILING -> READY_FOR_CLOSURE -> CLOSED
```

- `DRAFT` means the exercise, scope, and assignments are being prepared.
- `ACTIVE` means its scope is fixed and physical counting is underway.
- `RECONCILING` means counting has finished and exceptions are being resolved.
- `READY_FOR_CLOSURE` means all required work is complete and the exercise is
  awaiting final sign-off.
- `CLOSED` means an authorized reviewer has finalized the exercise as an
  immutable historical record.

The user-facing action for entering `CLOSED` shall be labelled **Finalize stock
take** rather than merely **Close**. Finalization applies only to that
stock-take exercise. It shall not close a store, freeze inventory, or stop
normal stock transactions.

An exercise shall become `READY_FOR_CLOSURE` only when:

- every scoped line has been accounted for;
- every mandatory recount has been submitted;
- every discrepancy investigation is resolved;
- every required linked correction, adjustment, or other workflow has
  completed; and
- every scope amendment has been accounted for.

An authorized final reviewer may then finalize it. Finalization shall preserve
an immutable result snapshot and finalization actor and time. It shall not
itself change any stock record.

After finalization, no user may add, replace, or edit counts inside that
exercise. A later discovery shall create a linked follow-up or correction
record rather than rewriting the closed exercise.

Historical comparisons shall use closed exercises. Comparisons may cover
quantities, values, conditions, losses, and discrepancies, but shall disclose
scope differences and shall not claim that two exercises are directly
comparable when their scopes differ.

##### Reason

Finalization establishes when an exercise became the institute's accepted
historical account and makes its reports reproducible. Requiring completed
follow-up first prevents unresolved discrepancies from being hidden by a
finished label, while linked later findings preserve correction without
changing what was originally reviewed and accepted.

#### DEC-007: Reconcile concurrent activity and require decisive recount evidence

- **Status:** Accepted
- **Area:** Physical stock-taking and reconciliation
- **Builds on:** System-wide / SYS-001, Area 6 / DEC-003,
  Area 9 / DEC-001, Area 9 / DEC-002, Area 9 / DEC-003,
  Area 9 / DEC-004, Area 9 / DEC-006

The activated scope rules shall continue determining which stock falls within
an exercise while authorized operations continue:

- stock entering the scope before its physical count shall become expected
  there;
- stock leaving before its count shall be removed from that location's
  expectation and shown as intervening activity;
- stock added or moved after a line was counted shall be reported as
  post-count activity and shall not retroactively create a discrepancy; and
- an individually tracked unit already verified in the exercise shall not be
  counted as a second holding merely because it later moves within the scope.

Stock in the `IN_TRANSIT` movement state at the applicable count time shall not
be treated as physically present at either its source or destination. The
exercise shall show it separately with its linked movement record.

If a relevant stock transaction commits while a count form is open, submission
shall warn the counter and recalculate the time-aware expectation using the
exact count time before showing the comparison.

Each stock-take line shall have one count of record. Every later count shall be
a linked recount rather than a second independent line. If the first count and
required recount disagree, the system shall require a blind third count by a
third person. If two independent results match, that repeated result becomes
the confirmed observation. If all three differ, the case shall remain under
investigation; a reviewer shall not simply choose a preferred result.

Stock that cannot be accessed shall be recorded as `NOT_COUNTED`, not as zero,
absent, or `NOT_OBSERVED`. The record shall require a reason and shall block
normal finalization unless an authorized verification exception is approved
and prominently disclosed in the final result.

An unreadable or otherwise unverifiable identifier shall create an
unidentified-stock observation and investigation. The system shall not guess
its identity or match it to an expected unit without supporting evidence.

##### Reason

An exercise spanning active operations must distinguish the physical
observation time from transactions occurring before and after it. These rules
prevent valid movements from becoming false discrepancies or duplicate stock.
Independent matching evidence resolves ordinary count conflicts, while
inaccessible and unidentified stock remains visibly unverified instead of
being converted into a convenient but unsupported number.

#### DEC-008: Allow controlled concurrency between stock-take exercises

- **Status:** Accepted
- **Area:** Physical stock-taking and reconciliation
- **Builds on:** System-wide / SYS-001, Area 9 / DEC-001,
  Area 9 / DEC-002, Area 9 / DEC-007
- **Resolved by:** Area 10 / DEC-012 for overlap-authorization permissions

Multiple non-overlapping stock-take exercises may proceed independently. Before
activation, the system shall resolve overlapping scope filters into the exact
inventory units and quantity-balance lines affected and shall prevent duplicate
active assignments within one exercise.

Two exercises whose scopes cover any of the same stock shall be blocked from
overlapping by default. An explicitly authorized exception may permit the
overlap for a recorded purpose, such as an independent audit. Before approval,
the system shall show the authorizer the exact overlapping stock and affected
exercises.

Counts shall remain native to the exercise in which they were submitted. A
count, recount, sign-off, or resolution in one exercise shall not satisfy the
requirements of another. A completed transaction or correction resulting from
one exercise shall appear as time-aware intervening activity in every other
affected active exercise.

Every post-activation scope amendment shall repeat the overlap check:

- an inclusion shall create the necessary new uncounted lines;
- excluding already-counted stock shall require authorization and shall retain
  the observations labelled `EXCLUDED_AFTER_COUNT`; and
- an amendment that invalidates an earlier observation shall require a linked
  recount.

##### Reason

A single institution-wide active-exercise lock would allow a delayed
departmental reconciliation to block unrelated or urgent work. Scope-aware
concurrency avoids that synchronous bottleneck. Default blocking and explicit
authorization make genuinely overlapping verification deliberate without
mixing the evidence or progress of separate exercises.

#### DEC-009: Preserve late, aborted, and post-finalization stock-take history

- **Status:** Accepted
- **Area:** Physical stock-taking and reconciliation
- **Builds on:** System-wide / SYS-001, Area 9 / DEC-001,
  Area 9 / DEC-002, Area 9 / DEC-006
- **Resolved by:** Area 10 / DEC-012 for late-entry and abandonment authorization
- **Defers to:** Area 11 for amended-report presentation

A permitted late or offline count entry shall preserve both:

- the claimed exact `counted_at` time; and
- the automatic immutable `recorded_at` time.

It shall require a reason and shall be visibly flagged as entered late. Its
claimed count time shall not precede exercise activation or be later than its
actual recording/submission time. Authorization is defined in Area 10 /
DEC-012; the institute may confirm which offline evidence references it accepts.

A stock-take exercise may leave the normal completion lifecycle without being
deleted:

- a `DRAFT` exercise that will not proceed may become `CANCELLED`; and
- an activated exercise that cannot continue may become `ABORTED` through an
  authorized action with a required reason.

A cancelled or aborted exercise shall preserve all scope, assignments, counts,
findings, actors, and times already recorded. It shall not appear as a
completed stock take or satisfy a reporting-period requirement. A replacement
exercise may explicitly link to it.

Information discovered after an exercise is finalized shall create a
`POST_CLOSURE_FINDING`. The finding may initiate the appropriate investigation,
correction, or other domain workflow and may support a clearly labelled amended
report. It shall never alter or replace the original closed snapshot or final
report.

##### Reason

Offline entry, interruption, and later discovery are legitimate operational
possibilities, but none justifies rewriting history. Separate event and
recording times reveal late entry; terminal cancellation and abandonment states
preserve incomplete work honestly; and post-closure findings permit correction
without changing what reviewers originally finalized.

### Area 10 — People, Roles, Permissions, and Approvals

#### DEC-001: Separate people, user accounts, organizational actors, and roles

- **Status:** Accepted
- **Area:** People, roles, permissions, and approvals
- **Builds on:** System-wide / SYS-001, Area 3 / DEC-001,
  Area 3 / DEC-002, Area 3 / DEC-004

The system shall represent these concepts separately:

- **Person:** a real staff member or other individual known to the institute.
- **User account:** an authentication identity optionally linked to one person.
- **Organizational unit:** a department or office that may hold custody or
  responsibility but cannot authenticate as a person.
- **System actor:** the reserved identity attributed to automated system
  actions.
- **Role assignment:** permission granted to a user account within an explicit
  scope.

A person may exist without a user account. A custodian, holder, recipient, or
other responsible party shall not require login access merely to appear in the
inventory chain of responsibility.

Interactive user accounts shall not be shared. Every authenticated human action
shall identify one user account and, where linked, its person. Disabling an
account shall not delete its person record, past responsibilities, role
history, or audit events.

An automated action shall identify `SYSTEM` as its immediate actor and shall
retain the human action, scheduled rule, or preceding domain event that
triggered it.

People and account records shall initially be administered within this system.
No integration with an external human-resources or identity directory is
assumed.

##### Reason

Business responsibility and system access are different facts. Keeping them
separate allows non-users to remain visible in custody and receipt history
without creating unnecessary accounts. Named accounts preserve human
accountability, while stable person and system-actor records keep history
intelligible after access changes or automated processing.

#### DEC-002: Build scoped roles from stable application permissions

- **Status:** Accepted
- **Area:** People, roles, permissions, and approvals
- **Builds on:** System-wide / SYS-001, Area 10 / DEC-001

The application shall define stable permissions representing specific actions,
such as:

```text
stocktake.count
stocktake.review
movement.release
movement.receive
adjustment.propose
adjustment.approve
```

The institute may create and name roles by bundling those available
permissions. It shall not invent new underlying permissions without a software
change. The system may provide clearly described role templates as starting
points, but shall not treat template names as fixed assumptions about the
institute's staffing or job titles.

A role shall grant no access by itself until assigned to a user account within
an explicit scope. One account may hold multiple role assignments, and its
effective permissions shall be the permitted combination of its active scoped
assignments.

Authorization shall be denied by default. Being recorded as a custodian,
holder, recipient, department head, or other responsible party shall not
implicitly grant system permissions.

Technical access administration and inventory business authority shall remain
separate. The system shall not provide one unrestricted `ADMIN` flag that
silently bypasses domain permissions, approval separation, or other business
controls.

##### Reason

Stable action permissions keep application behavior testable, while
institute-configured bundles allow staffing arrangements to evolve without
code changes. Explicit scoped assignments prevent job titles and business
responsibility from becoming accidental access grants. Separating technical and
inventory authority also protects audit controls from a universal privilege
shortcut.

#### DEC-003: Scope V1 role assignments through organizational responsibility

- **Status:** Accepted
- **Area:** People, roles, permissions, and approvals
- **Builds on:** System-wide / SYS-001, Area 1 / DEC-003,
  Area 3 / DEC-003, Area 3 / DEC-005, Area 9 / DEC-003,
  Area 10 / DEC-002

A V1 role assignment may be restricted through:

- the entire institution;
- an organizational unit;
- a specific workflow assignment, such as assigned stock-take lines.

For an organizational-unit restriction, the assigner shall explicitly select
whether it applies to:

- `THIS_NODE_ONLY`; or
- `INCLUDE_DESCENDANTS`.

Authorization shall require both the action permission and a matching scope.
Separate active assignments shall form a union of their respective grants.

Scope grants authority to perform permitted actions; it shall not change stock
custody, possession, holder, or physical location.

A user shall not grant a permission or scope broader than the authority they
are permitted to administer. Before an organizational hierarchy change takes
effect, the system shall preview role assignments whose future effective access
would change. The hierarchy change and its access consequences shall be
audited.

Physical locations and catalogue categories shall remain available for stock
classification, searching, filtering, reporting, and the domain rules already
defined elsewhere. They shall not form permission boundaries or be intersected
with organizational scopes in V1. Location- or category-based authorization may
be introduced later only when an institution provides a concrete need.

Every domain event shall retain the acting account, effective permission, and
resolved scope that authorized it. Later role, assignment, or hierarchy changes
shall not rewrite that historical authorization context.

##### Reason

The organizational hierarchy allows one role definition to serve different
departments without proliferating near-identical roles. Explicit descendant
selection prevents surprising access, while omitting location/category
intersections keeps V1 understandable and avoids solving an unconfirmed
authorization problem. Preserving resolved historical authority explains why
an action was allowed even after the organizational structure changes.

#### DEC-004: Apply versioned, action-specific approval separation

- **Status:** Accepted
- **Area:** People, roles, permissions, and approvals
- **Builds on:** System-wide / SYS-001, Area 3 / DEC-004,
  Area 5 / DEC-001, Area 6 / DEC-003, Area 6 / DEC-005,
  Area 7 / DEC-010, Area 7 / DEC-011, Area 7 / DEC-012,
  Area 9 / DEC-005, Area 9 / DEC-006, Area 9 / DEC-008,
  Area 9 / DEC-009, Area 10 / DEC-002, Area 10 / DEC-003

Every controlled request shall have a versioned proposal. An approval shall
apply only to the exact proposal version reviewed. A material change shall
create a new version and invalidate approvals collected for the earlier
version.

Where a workflow requires separate participants:

- the same person shall not satisfy two separately required roles on the same
  transaction, even through different accounts, role assignments, or delegated
  authority;
- holding wider authority shall not permit bypassing a required approval or
  confirmation step; and
- approval permissions shall remain action-specific and scope-bound rather than
  being combined into one unrestricted `APPROVER` power.

Approval, rejection, and withdrawal shall be immutable events. Each shall
preserve its actor and time, and shall require a reason whenever the action
rejects, overrides, or withdraws a pending request.

Separate approval shall apply to these established high-risk actions:

- confirmed loss;
- write-off and disposal;
- reconciliation adjustment;
- stock-take overlap and verification exceptions;
- stock-take finalization;
- authorized offline or fallback procedures.

`MASTER_ADMIN` is the V1 root authority for accounts, roles, scopes, and
delegations. Its permitted access-administration actions shall be audited but
shall not require approval from another account. This root authority shall not
allow `MASTER_ADMIN` to bypass any independently required stock-operational or
financial approval.

Existing operational participation shall remain distinct from managerial
approval:

- normal movement uses the established source-release and recipient-receipt
  confirmations without an additional managerial approval by default;
- a loan extension uses the borrower's request and custodian's decision;
- reporting damage creates a case rather than requiring prior approval; and
- ordinary authorized stock creation retains creator accountability rather than
  adding a new approval stage.

##### Reason

An approval has meaning only for the facts its approver reviewed. Versioning
prevents a changed request from reusing stale consent, and participant
separation prevents one account from manufacturing an independent decision.
Limiting the pattern to high-risk actions protects auditability without making
ordinary inventory work unnecessarily bureaucratic.

#### DEC-005: Use bounded, non-impersonating delegation

- **Status:** Accepted
- **Area:** People, roles, permissions, and approvals
- **Builds on:** System-wide / SYS-001, Area 10 / DEC-001,
  Area 10 / DEC-002, Area 10 / DEC-003, Area 10 / DEC-004

Temporary absence coverage shall delegate one or more complete active role
assignments rather than selected permissions, a user account, or an identity.
Credentials shall never be shared.

Every delegation shall identify:

- the original role assignment;
- the delegate;
- its reason;
- an exact start time; and
- a mandatory exact expiry time.

A delegation shall preserve the complete permissions and scope of each selected
role assignment. It shall not expand, split, or otherwise modify that
assignment. If a narrower responsibility recurs, the Master Admin may create
or assign a smaller reusable role rather than enabling permission-by-permission
delegation in V1.

The proposed delegate shall explicitly accept or reject the delegation through
their own account. Rejection shall require no replacement action by the system;
the delegator may propose another delegation. An accepted delegation shall
grant authority only during its exact validity interval.

One proposal may contain several complete assignments held directly and
effectively by one delegator, but it shall name one delegate and receive one
atomic whole-proposal response. Only the current effective direct holder may
propose an assignment; root administration shall not propose another holder's
authority. Acceptance may occur after the scheduled start but strictly before
expiry. Authority begins only after both acceptance and the start have
occurred. Acceptance reasons are optional; proposal, rejection, revocation,
relinquishment, and administrative-termination reasons are mandatory.

V1 delegation recipients shall be restricted through existing direct
organizational authority rather than an unmodeled employment-department
assumption. A recipient shall hold at least one currently effective direct,
non-root role assignment in the same department branch as every delegated
source. A department and its sub-departments form one branch. An
institution-scoped source requires a separate direct institution-scoped
recipient assignment. Delegated authority shall not establish recipient
eligibility, and the qualifying direct assignment shall have no known effective
end before the requested delegation expiry.

Recipient discovery shall expose only active accounts sharing at least one
eligible branch with the delegator's delegatable sources. After a recipient is
selected, only mutually compatible sources shall be offered. Proposal creation
and recipient acceptance shall revalidate compatibility authoritatively. Once
accepted, the bounded delegation itself records the temporary appointment; an
unexpected later change to the recipient's qualifying assignment shall not
silently rewrite or terminate that accepted decision. The source assignment,
delegate account, exact interval, synchronous source effectiveness, and
explicit termination actions shall continue to control delegated access.

V1 shall permit at most one overlapping pending or accepted delegation for
each source role assignment. Proposal creation shall reject the entire bundle
when any selected source already has overlapping coverage. Rejected, expired,
revoked, relinquished, and administratively terminated delegations shall not
block later coverage. This is a reversible application-level safety policy,
not a permanent database restriction.

The single-coverage rule deliberately treats delegation as an exceptional
temporary managerial-coverage mechanism. Allowing multiple delegates would
multiply every permission and the full organizational reach of the source
assignment, increase the number of people able to initiate unrelated work, and
make accidental duplicate proposals an access-expansion event. It could also
blur the distinction between the directly appointed departmental manager and
temporary acting coverage. V1 sidesteps those risks until real institutional
evidence establishes a parallel-delegation need. Parallel operational
participation shall instead use deliberate direct assignments, narrower
reusable roles, or later task-routing capabilities.

The delegate shall act through their own account, and every resulting event
shall preserve both the acting user and the delegation through which authority
was obtained. Re-delegation shall be prohibited by default.

Delegation shall change access only. It shall not automatically change stock
custody, possession, physical location, or pending business responsibility. An
approved delegate may handle appropriately routed tasks during the valid
period, but shall not reuse confirmations previously supplied by the delegator.

`MASTER_ADMIN` shall not be delegatable. The system may mark another complete
role as non-delegatable when its established authority must not be transferred.
Routine delegation of a delegatable role shall require the delegator's proposal
and the delegate's acceptance, without adding a separate managerial approval.

Delegation shall not change who organizational views identify as the directly
appointed manager or role holder. The direct holder remains the
manager-of-record, while temporary coverage is shown separately as delegated
authority. Proposer and recipient interfaces shall warn that the complete
assignment is being transferred temporarily and shall show its role,
permissions, organizational scope and descendant reach, and exact interval
before confirmation.

Delegated authority shall expire automatically and may be revoked earlier
through an append-only action. The delegator may revoke pending or accepted
coverage, the delegate may relinquish accepted coverage, and effective
`access.root` may terminate pending or accepted coverage administratively.
Authorization checks shall enforce the exact validity interval directly: once
`now >= expires_at`, access through the delegation shall be denied even if a
background process is delayed.

Every source shall be effective when proposed and shall have a known effective
end no earlier than the requested delegation expiry. A later source-assignment
termination or account, role, or organizational-scope deactivation shall stop
only the affected delegated item immediately; other items in the accepted
proposal may remain effective. Ending the delegation itself ends all items.
Delegated authority shall never be a source for another delegation.

A scheduled or queued expiry process may append the expiry event, refresh
permission projections, invalidate relevant cached authorization or sessions,
and issue notifications. Security correctness shall not depend solely on that
process running on time.

Permanent staffing changes shall use explicit role-assignment revocation and
new role assignments rather than indefinite delegation.

##### Reason

Delegation should cover a bounded absence without allowing impersonation,
privilege expansion, or permanent access drift. Complete role assignments are
understandable to non-technical users and avoid an error-prone permission
checklist. Recipient acceptance proves that the temporary responsibility was
knowingly received. Enforcing expiry during every authorization decision
closes the delay window inherent in background jobs, while queued expiry
processing keeps audit events, caches, sessions, and notifications synchronized.
Keeping the single-overlap restriction in the service preserves the accepted
safe default without making it an irreversible data-model assumption. If
operational evidence later supports parallel temporary coverage, the existing
append-only proposal, response, termination, and evidence model can retain its
history while the service policy, tests, and presentation are deliberately
revised.

#### DEC-006: Preserve account lifecycle and provide manual access oversight

- **Status:** Accepted
- **Area:** People, roles, permissions, and approvals
- **Builds on:** System-wide / SYS-001, Area 3 / DEC-001,
  Area 3 / DEC-002, Area 10 / DEC-001, Area 10 / DEC-002,
  Area 10 / DEC-003, Area 10 / DEC-005

User accounts shall follow this controlled lifecycle:

```text
INVITED -> ACTIVE <-> SUSPENDED -> DEACTIVATED
```

`SUSPENDED` shall temporarily block login and authority obtained through the
account. `DEACTIVATED` shall represent access that is no longer expected.
Reactivating a deactivated account shall require a new authorized,
append-only event. Accounts, role assignments, delegations, and access history
shall never be deleted.

Suspension or deactivation shall invalidate active sessions and cached
permissions and shall stop active role assignments and delegations from
granting access. Pending tasks assigned to the account shall be flagged for
reassignment.

Ending account access shall not retroactively invalidate completed,
properly-authorized actions or approvals. It shall not automatically move
stock, transfer custody or possession, end loans, or reassign organizational
responsibility. Those changes shall use their respective domain workflows. The
person record and historical responsibilities shall remain preserved even when
the person leaves the institute.

V1 shall provide the Master Admin with an access-overview page showing account
status, relevant last-use information, current role assignments and scopes,
and active or upcoming delegations. The Master Admin may manually suspend or
deactivate an account and may end or replace a role assignment through the
controlled append-only processes.

V1 shall not implement scheduled access-review campaigns, review deadlines,
automated retention decisions, or human-resources transfer workflows. The
system shall not infer that a staff transfer, role change, or disciplinary
event occurred. Authority shall remain effective until an authorized person
changes it, and actions performed while it remains active shall retain their
full audit history. Determining whether a person misused authority and deciding
any institutional consequence shall remain outside the stock system.

##### Reason

Account access, historical action, and responsibility for stock are separate
facts. Immediate session and permission invalidation protects the system
without erasing valid prior decisions or moving stock implicitly. A clear
manual overview gives the Master Admin the tools to correct current access
without expanding V1 into human-resources administration or an institutional
disciplinary system.

#### DEC-007: Separate authenticated accounts from one-purpose recipient confirmation

- **Status:** Accepted
- **Area:** People, roles, permissions, and approvals
- **Builds on:** System-wide / SYS-001, Area 3 / DEC-004,
  Area 10 / DEC-001, Area 10 / DEC-002, Area 10 / DEC-004,
  Area 10 / DEC-006

The initial system shall support local authentication through named user
accounts. No external identity provider shall be assumed.

Each account shall have unique credentials. Passwords shall not be shared or be
recoverable in readable form by an administrator. Authentication shall
rate-limit repeated attempts and audit relevant suspicious failures.

Account recovery shall use a short-lived, single-use challenge. Successful
password reset shall invalidate relevant existing sessions.

When Master Admin creates an interactive account, the system shall generate a
strong temporary password that is not shown to the administrator or account
holder and persist only its hash. The account holder shall replace it with
their chosen 8–25 character password through a short-lived, single-use setup
challenge sent to their official email address. The setup challenge shall be
purpose-bound, supersedable, and recorded with the account-creation audit
history. Setting the chosen password shall verify that official email address.
Password hashes shall be the only durable password representation.

Initial setup and later password recovery shall share the same challenge and
redemption mechanism while retaining distinct purposes, endpoints, audit
events, and email content. Durable queue payloads shall contain only the
challenge identifier, never a readable password or recovery token. An account
whose official email is still unverified may request a replacement
initial-setup link through the neutral recovery endpoint.

V1 shall not impose scheduled password expiry. If credentials are forgotten or
suspected to be compromised, the account holder shall use the authorized
recovery process. Master Admin may suspend or revoke the account. Administrative
password reset remains a separate, deferred workflow. A successful recovery
reset shall invalidate the previous password and relevant existing sessions.

V1 shall not require or implement application multi-factor authentication.
The institute may reconsider it later if the risk, available devices, and
operational need justify the additional login and recovery workflow.

A recipient without a user account may confirm or reject one business action
through a recipient-controlled email challenge. Every challenge shall be:

- addressed to a verified recipient address;
- tied to one recipient, transaction, requested action, and exact proposal
  version;
- short-lived and single-use; and
- invalidated if the underlying proposal changes or a replacement challenge is
  issued.

Before acting, the recipient shall see the transaction details necessary to
make the decision. Successful confirmation shall not create an authenticated
session or grant access to other system functions.

Challenge issue, replacement, expiry, failed attempts, confirmation, and
rejection shall be audited. An unavailable or failed electronic challenge shall
use only the separately authorized fallback procedure established for that
workflow; it shall not silently bypass confirmation.

##### Reason

Named authentication preserves accountability for system users, while
single-purpose challenges let non-users participate without creating excess
accounts. Binding each challenge to an exact proposal prevents changed
transactions from reusing consent, and keeping confirmation separate from login
prevents an emailed code from becoming wider system access.

#### DEC-008: Separate access provisioning from reusable business roles

- **Status:** Accepted
- **Area:** People, roles, permissions, and approvals
- **Builds on:** System-wide / SYS-001, Area 7 / DEC-011,
  Area 7 / DEC-012, Area 7 / DEC-013, Area 8 / DEC-003,
  Area 10 / DEC-001, Area 10 / DEC-002, Area 10 / DEC-004

The initial authorization model shall separate access provisioning from
business authority. These are reusable roles rather than a role-inheritance
tree:

```text
Access provisioning:
  MASTER_ADMIN

Business operations:
  STOCK_SUPERVISOR
  FINANCE_SUPERVISOR
  STOCK_TAKER
```

`MASTER_ADMIN` shall be created during deployment and shall provision people,
user accounts, and their access. It shall not receive stock-operational or
stock-financial authority merely because it creates those accounts.

`FINANCE_SUPERVISOR` and `STOCK_SUPERVISOR` shall be sibling, reusable business
roles rather than one inheriting the other's authority:

- `STOCK_SUPERVISOR` shall administer physical and operational inventory within
  its assigned scope, including intake, movement, condition, investigations,
  repair, physical-disposal processing, and stock-taking.
- `FINANCE_SUPERVISOR` shall handle the stock system's financial information
  and financial approvals, including applicable valuation decisions, write-off
  and restoration, financial effects of reconciliation, donation-related
  financial information, and the financial authorization associated with
  disposal.

Sale shall be represented as an approved disposal method under Area 7, not as a
separate sales module. A `STOCK_SUPERVISOR` shall manage the physical stock and
handover side, while a `FINANCE_SUPERVISOR` shall participate in the applicable
financial authorization and record or reference the financial outcome. The
system shall not process payment, procurement, or general-ledger entries. No
procurement-specific role shall be introduced unless future in-scope
procurement responsibilities justify one.

User-account creation and a stock-take assignment shall remain separate.
`MASTER_ADMIN` creates or enables the person's account and grants its access;
an authorized `STOCK_SUPERVISOR` assigns the actual stock-take work. A
`FINANCE_SUPERVISOR` may also receive a `STOCK_TAKER` assignment when
operationally required.

One person shall use one named account. The holder of `MASTER_ADMIN` may receive
one or more separately scoped business-role assignments on that same account.
Their access-provisioning actions derive from `MASTER_ADMIN`; their inventory
actions derive only from the applicable business-role assignment. Assigning
operational authority shall not require or permit a second account for the same
person.

Holding more than one role shall not weaken participant separation. A person
who counted, proposed, investigated, or otherwise participated in a matter
shall not use another one of their roles to provide an approval that is required
to be independent.

##### Reason

Access provisioning, physical stock administration, and stock-related financial
authority answer different institutional questions. Reusable sibling Stock and
Finance roles allow each side to perform its part of write-off and disposal
without giving that authority implicitly to the deployment administrator. The
same person can legitimately hold several responsibilities without fragmenting
their identity across accounts, while person-level separation still prevents
self-approval. Treating sale as a disposal method preserves the established
inventory boundary while still involving Finance in its financial consequences.

#### DEC-009: Keep organizational structure separate from reusable roles

- **Status:** Accepted
- **Area:** People, roles, permissions, and approvals
- **Builds on:** System-wide / SYS-001, Area 3 / DEC-001,
  Area 10 / DEC-001, Area 10 / DEC-002, Area 10 / DEC-003,
  Area 10 / DEC-008

The Master Admin shall centrally maintain the institute's organizational
structure. The initial user-facing structure shall support:

```text
Institute
└── Department
    └── optional sub-department
```

The underlying organizational-unit model shall use a parent relationship so
that future institute structures are not blocked by this initial presentation.
Organizational units shall define where authority applies; roles shall define
what actions are permitted. `MASTER_ADMIN`, `STOCK_SUPERVISOR`,
`FINANCE_SUPERVISOR`, and `STOCK_TAKER` shall not be represented as departments
or as children in the organizational tree.

Roles shall be reusable permission groupings. A role assignment shall connect:

```text
one account + one role + one organizational scope
```

For example, the same `STOCK_SUPERVISOR` role may be assigned separately for
Engineering and ICT. A `STOCK_TAKER` may be scoped to a sub-department, while a
`FINANCE_SUPERVISOR` may be scoped across the institution where authorized.
Operational reporting relationships shall not cause role-permission
inheritance.

Departments and sub-departments shall not create their own role definitions.
When a unit identifies a missing authority, the request shall be raised to the
Master Admin, who shall first reuse a suitable existing role or centrally
create a role from the application's available permissions. Role assignments
may later be changed through append-only ending and replacement rather than
deleting their history.

##### Reason

Central control prevents duplicate or gradually inconsistent departmental
roles. Separating reusable permissions from organizational scope lets the same
role serve several units, keeps the hierarchy understandable to non-technical
users, and allows the institute structure to expand without redesigning the
authorization model.

#### DEC-010: Centralize intake through the Store Supervisor control point

- **Status:** Accepted — confirmed with the institute
- **Area:** People, roles, permissions, and approvals
- **Builds on:** Area 1 / DEC-002, Area 1 / DEC-005,
  Area 5 / DEC-001, Area 5 / DEC-002, Area 6 / DEC-003,
  Area 6 / DEC-006, Area 8 / DEC-001, Area 10 / DEC-002,
  Area 10 / DEC-008, Area 10 / DEC-009

V1 shall provide one reusable `STORE_SUPERVISOR` role as the institution's
single stock-intake authority. The control point shall be the role and process
rather than necessarily one person: several authorized people may hold the
role, and the whole-role delegation established in Area 10 / DEC-005 may cover
an absence.

Only an active `STORE_SUPERVISOR` assignment shall create institutional stock
through opening-stock or intake records. Departmental `STOCK_SUPERVISOR`
assignments shall request, receive, move, manage, and account for stock within
their authority, but shall not create new stock. The Store Supervisor shall
reuse or create the applicable catalogue item and record each distinct intake
once; subsequent receipts of the same item shall create new intake records
rather than duplicate catalogue items.

For stock received into the central store, the intended flow shall be:

```text
Store Supervisor records intake
→ stock is available under Central Store accountability
→ department request is authorized
→ Store Supervisor allocates and submits the movement
→ PENDING_RELEASE
→ Store Supervisor confirms source release
→ IN_TRANSIT
→ destination confirms receipt
→ COMPLETED
```

A request submitted by the authorized destination Stock Supervisor shall
already represent the destination's authorization. A request submitted by
another permitted requester shall require the destination Stock Supervisor's
approval before Store processes it.

The institute has confirmed that ordinarily procured and delivered stock first
comes physically through the central store. V1 shall therefore not provide a
direct-to-department intake shortcut for ordinary incoming stock. The Store
Supervisor shall inspect and record the intake under Central Store
accountability before any departmental allocation begins. A later departmental
delivery shall use the canonical movement, source-release, in-transit, and
destination-receipt controls.

If stock that has already been received and recorded cannot remain physically
in the central store, the Store Supervisor may propose another department as
its physical storage location. The destination Stock Supervisor must accept
before movement. When the department is providing storage only, physical
location and holder may change while Central Store custody remains unchanged;
the stock shall not become departmental stock merely because it is stored
there. A genuine departmental allocation shall explicitly transfer the
applicable custody and balance.

The Store Supervisor may record the quantity and value stated by the intake
evidence. This is factual entry rather than authority to revalue stock.
Financial valuation corrections and other established financial consequences
shall remain under `FINANCE_SUPERVISOR`.

All intake, linked movement, confirmation, and correction records shall follow
the system-wide append-only rule. The complementary manual record supplies
physical evidence and continuity before system entry; it shall not replace the
system's eventual intake and movement audit trail.

##### Reason

A single physical and system intake authority creates one complete
institutional entry point for stock, reduces duplicate catalogue and balance
creation, and gives stock-taking a traceable acquisition population. Requiring
ordinary deliveries to enter through Central Store removes ambiguous
departmental creation paths. Separating Store intake from departmental stock
management also keeps each reusable role aligned with one understandable
responsibility.

#### DEC-011: Allocate condition, loss, repair, recovery, and disposal authority

- **Status:** Accepted
- **Area:** People, roles, permissions, and approvals
- **Builds on:** Area 7 / DEC-006, Area 7 / DEC-007,
  Area 7 / DEC-008, Area 7 / DEC-009, Area 7 / DEC-011,
  Area 7 / DEC-012, Area 7 / DEC-014, Area 7 / DEC-015,
  Area 7 / DEC-019, Area 7 / DEC-022, Area 7 / DEC-025,
  Area 10 / DEC-001, Area 10 / DEC-004, Area 10 / DEC-008,
  Area 10 / DEC-010

Condition and loss reporting shall remain deliberately broader than authority
to confirm an outcome. An active `STOCK_TAKER`, `STORE_SUPERVISOR`, or
`STOCK_SUPERVISOR` assignment may record an observed damage or missing-stock
report within its permitted context. A movement recipient may report damage,
missing quantity, or another discrepancy through the established receipt
confirmation process.

When the observer is not the authenticated recorder, the event shall preserve
both the identified observer and the recording account. Creating a report shall
not grant the observer wider system access. Reports, corrections, and mistaken
reports shall remain append-only.

`STOCK_SUPERVISOR` shall:

- review damage reports and select the applicable interim-use or quarantine
  disposition;
- coordinate technical assessment where the condition is outside their own
  competence;
- coordinate missing-stock investigations;
- open and authorize operational repair cases;
- propose disposal after considering the available condition, assessment, and
  repair evidence; and
- record explicit manual damage-case outcomes such as accepted with damage or
  entered in error when permitted and supported by a reason.

Review authority shall not turn a Stock Supervisor into the technical source of
a diagnosis. Technical findings shall retain the assessor or repairer who
supplied them and any supporting evidence.

Changing `MISSING_UNDER_INVESTIGATION` to `CONFIRMED_LOST` shall require a
separate `STOCK_SUPERVISOR` confirmation. The confirming person shall not be the
reporter, current accountable holder, investigation coordinator, or another
person whose participation is required to be independently reviewed. The
investigator and confirmer may hold the same reusable role type, but shall be
different people. Multiple accounts, additional roles, or delegation shall not
allow one person to fill both positions.

A repairer shall be represented as the person or external party that supplied
the assessment and repair outcome, not automatically as a system role. An
authorized internal repairer with an appropriate account may record the outcome
directly. Otherwise, a Stock Supervisor may record the repairer's signed or
referenced outcome while preserving both the repairer and the recording actor.
Repair completion shall not itself change functional condition to `WORKING`;
the official post-repair condition shall require the separate assessment and
receiving controls established in Area 7.

Anyone who finds missing or lost stock may report the finding through an
authorized recorder. The finding report shall not change loss status. Recovery
shall be confirmed by the party physically receiving the stock, as required by
Area 7 / DEC-025:

- the intended destination recipient or authorized representative during an
  in-transit movement; or
- an authorized receiving officer, commonly the Stock Supervisor, for the
  custodial organizational unit receiving it outside a movement.

The recovery confirmation shall apply `RECOVERY_HOLD` and preserve all other
independent restrictions until their own resolution processes complete.

A Stock Taker may report the observed condition or recommend further review but
shall not propose or authorize disposal. A `STOCK_SUPERVISOR` shall create the
disposal proposal. A `STORE_SUPERVISOR` shall coordinate and record physical
disposal completion only after the required disposal and financial
authorization is present.
Completion shall identify the exact stock or quantity and retain
method-appropriate evidence, including recipient or handover evidence for sale
or donation and witness or destruction evidence for scrapping or destruction.

Completing a repair, disposal, or another explicitly linked resolution shall
atomically allocate the exact resolved damage quantity and append the
damage-case `RESOLVED` event when every affected quantity is accounted for, as
required by Area 7 / DEC-022. A Stock Supervisor shall not manually close a case
while linked quantities remain unresolved.

##### Reason

Broad reporting exposes problems promptly, while controlled confirmation
prevents an observation from becoming an unsupported loss or disposal
decision. Person-level separation protects investigations from self-review.
Keeping technical evidence attributable to the actual repairer avoids excess
accounts without misrepresenting who made the finding. Central physical
disposal control, method-specific evidence, and atomic case resolution preserve
accountability for irreversible outcomes.

#### DEC-012: Allocate stock-taking and reconciliation authority

- **Status:** Accepted
- **Area:** People, roles, permissions, and approvals
- **Builds on:** Area 9 / DEC-001, Area 9 / DEC-002,
  Area 9 / DEC-003, Area 9 / DEC-004, Area 9 / DEC-005,
  Area 9 / DEC-006, Area 9 / DEC-007, Area 9 / DEC-008,
  Area 9 / DEC-009, Area 10 / DEC-004, Area 10 / DEC-008,
  Area 10 / DEC-010

An appropriately scoped `STOCK_SUPERVISOR` shall create a stock-take exercise,
define its scope, assign count work, and activate it. Only a person with an
active `STOCK_TAKER` assignment for the applicable work may submit a physical
count.

The counting and review allocation shall be:

- one assigned Stock Taker submits the first count;
- a discrepancy, mismatch, unexpected observation, or selected spot-check
  requires a blind recount by a different assigned Stock Taker;
- disagreement between the first two counts requires a blind third count by a
  third person;
- a Stock Supervisor may review assignment completion but shall not alter a
  count; and
- a person who also holds a supervisor role shall not review or finalize their
  own submitted count.

A stock custodian may perform the first count of stock under their
responsibility when explicitly assigned as a Stock Taker. That participation
shall not weaken the independent recount and review rules.

A Stock Supervisor shall investigate discrepancies and propose the appropriate
linked domain process. A proven record error requiring reconciliation shall be
proposed by a Stock Supervisor and approved or rejected by a
`FINANCE_SUPERVISOR` who is a different person. Approval shall apply to the
exact quantity and financial effect of the proposal. The system shall
revalidate and apply an approved adjustment atomically.

Stock-take overlap, `NOT_COUNTED`, scope-exclusion, late/offline count, and
other established verification exceptions shall require an authorized Stock
Supervisor who is not the affected counter or requester of the exception.
The managing Stock Supervisor may abort an active exercise with a mandatory
reason because abortion preserves the incomplete exercise rather than treating
it as completed.

The system shall derive `READY_FOR_CLOSURE` only after every count, recount,
investigation, exception, and linked correction is complete. A different
Stock Supervisor who did not perform the affected counting or reconciliation
proposal shall perform **Finalize stock take** and create the immutable closed
snapshot.

A Stock Taker or Stock Supervisor may record a post-closure finding without
changing the closed exercise. Unregistered stock observed during counting
shall remain an observation until investigation is complete. Only a Store
Supervisor may then create the stock with `STOCK_TAKE_DISCOVERY` provenance.

##### Reason

The allocation keeps physical observation with assigned counters, operational
investigation with Stock, and the financial consequence of a genuine record
adjustment with Finance. Targeted independent recount and final review protect
the accepted stock-take record without requiring two counters for every normal
line or preventing custodians from helping where staffing is limited.

#### DEC-013: Record stock-finance decisions without becoming an accounting system

- **Status:** Accepted
- **Area:** People, roles, permissions, and approvals
- **Builds on:** Area 7 / DEC-011, Area 7 / DEC-012,
  Area 7 / DEC-013, Area 7 / DEC-014, Area 7 / DEC-015,
  Area 7 / DEC-019, Area 8 / DEC-001, Area 8 / DEC-002,
  Area 8 / DEC-003, Area 8 / DEC-004, Area 8 / DEC-005,
  Area 10 / DEC-004, Area 10 / DEC-008, Area 10 / DEC-010,
  Area 10 / DEC-011

The stock system shall record Finance's stock-related decisions and their
references without implementing the institute's valuation-engagement,
procurement, quotation, invoicing, payment, or general-ledger processes. The
system may assume that Finance used the institution's proper external channels;
the audit trail shall identify who asserted and recorded the resulting decision.

The authority allocation shall be:

- a Store Supervisor records the quantity and source-document value supplied
  during intake;
- a Finance Supervisor records a formal valuation, revaluation, or valuation
  correction supported by the institute's external process;
- a Stock Supervisor proposes write-off after the required physical loss,
  damage, or other operational process, and Finance approves or rejects it;
- a Stock Supervisor proposes disposal, Finance records the applicable
  financial authorization for sale, outgoing donation, or another disposal
  method, and Store records the later physical completion;
- Store records an incoming donation as intake, while Finance records its
  supported value; and
- an approved transaction is applied by the system atomically rather than by
  manually overwriting the previous quantity or value.

V1 shall use **reinstatement** for returning previously written-off, recovered
stock to active accountable inventory. Reinstatement shall be separate from
repair:

```text
physical recovery confirmed
→ Stock Supervisor confirms accountability and proposes reinstatement
→ Finance Supervisor approves or rejects
→ system applies the approved reinstatement atomically
```

A repairer is required only when the recovered or damaged stock needs repair.
For repair expenditure, the repairer may supply a recommended scope and
estimated cost, the Stock Supervisor may request the work, and Finance may
approve or reject the recorded financial authorization. This decision shall
not create a purchase, payment, or accounts-payable workflow.

Every Finance approval or rejection shall preserve:

- the exact proposal or stock event to which it applies;
- a mandatory reason;
- the acting Finance Supervisor and exact time;
- the applicable amount as integer minor KES units;
- the external valuer, authorization, or report reference when supplied; and
- the resulting append-only financial event.

V1 shall retain the text reference for external valuation reports, approvals,
and other evidence and shall also permit authorized users to attach PDF or
DOCX supporting documents under Area 16 / DEC-005. An attachment shall support
the structured financial decision; it shall not replace the mandatory reason,
amount, actor, exact proposal version, or append-only financial event.

##### Reason

Finance participation protects stock values and irreversible financial
consequences, while treating its external procedure as a referenced input keeps
the inventory application within scope. Separating repair expenditure from
reinstatement prevents repair advice from returning written-off stock to active
accounts. Mandatory reasons, references, and narrowly scoped evidence
attachments retain useful audit support without building an accounting or
general document-management system.

#### DEC-014: Make Master Admin the audited V1 access root

- **Status:** Accepted
- **Area:** People, roles, permissions, and approvals
- **Builds on:** Area 10 / DEC-001, Area 10 / DEC-002,
  Area 10 / DEC-004, Area 10 / DEC-006, Area 10 / DEC-007,
  Area 10 / DEC-008, Area 10 / DEC-009

`MASTER_ADMIN` shall be the V1 root authority for creating and administering
people, accounts, organizational structure, roles, scopes, role assignments,
and delegations. It shall not require consent from another application user to
perform an action granted by that access-administration role.

All interactive accounts shall be created or enabled by Master Admin; V1 shall
not provide public registration. One person shall have one named account, and a
later return to service shall reactivate or appropriately restore that
historical identity rather than create a duplicate account. An account may hold
several reusable role assignments without requiring separate credentials.

The institute may configure an official email-domain requirement. Where
enabled, each account shall use a unique, personally operated official address
within that domain rather than a shared departmental mailbox.

Every Master Admin action shall remain append-only and auditable. Root access
administration shall not implicitly grant stock-operational or financial
authority and shall not bypass person-level approval separation. The holder
must receive the applicable reusable business role on the same account before
performing a business action.

##### Reason

V1 needs one accountable authority capable of establishing and restoring
access without creating an approval loop above the root role. Named,
Master-created accounts prevent registration drift and fragmented identities.
Auditing every root action preserves responsibility without pretending that a
higher in-application authority exists.

#### DEC-015: Version material role-permission changes

- **Status:** Accepted
- **Area:** People, roles, permissions, and approvals
- **Builds on:** System-wide / SYS-001, Area 10 / DEC-002,
  Area 10 / DEC-008, Area 10 / DEC-009, Area 10 / DEC-014

A material change to the permissions contained in a reusable role shall create
a new immutable role version. It shall not edit the previous version or
silently change the authority of accounts already assigned to it.

Existing role assignments shall remain linked to the version originally
granted until Master Admin explicitly ends and replaces them with assignments
to the new version. The system shall show assignments using an older version
and allow Master Admin to review their effective access before replacement.
New assignments shall use the current active version unless an authorized
historical correction requires otherwise.

Renaming a display label or correcting non-authoritative descriptive text may
be recorded without changing permissions, but its history shall still be
auditable. Ending, superseding, or replacing a role version shall never delete
its assignments or the authorization context retained by past domain events.

##### Reason

A reusable role may affect many people. Versioning prevents one role edit from
silently expanding or removing their authority, while explicit replacement
makes the resulting access change deliberate and explainable.

#### DEC-016: Preserve submitted work across authority changes

- **Status:** Accepted
- **Area:** People, roles, permissions, and approvals
- **Builds on:** System-wide / SYS-001, Area 10 / DEC-004,
  Area 10 / DEC-005, Area 10 / DEC-006, Area 10 / DEC-014,
  Area 10 / DEC-015

Authorization shall be evaluated synchronously whenever a user attempts an
action. A time-bounded assignment or delegation shall grant authority only
while:

```text
starts_at <= now < expires_at
```

A scheduled job may append expiry events, invalidate sessions and permission
caches, update projections, and send notifications, but correctness shall not
depend on that job running on time.

Suspension, deactivation, revocation, expiry, or role-version replacement shall
prevent the affected authority from being used for new actions. It shall not
erase or retroactively invalidate work that was properly submitted, confirmed,
or approved while the authority was active.

An existing request shall remain attributed to its original requester. An
authorized person may receive pending responsibility through an append-only
reassignment without replacing that requester or copying their identity. A
renewed assignment or delegation shall create a new append-only grant rather
than extending history in place.

If the newly responsible person materially changes the proposal, the system
shall create a new proposal version and invalidate approvals tied to the
earlier version. If the proposal remains unchanged, a currently authorized
person may continue the pending workflow without forcing the original request
to be recreated.

##### Reason

Authority controls who may act now; it does not rewrite who acted validly in
the past. Synchronous expiry closes delays inherent in background processing,
while append-only reassignment and proposal versioning allow institutional work
to continue through absences and staff changes without falsifying its origin.

#### DEC-017: Require independent Store approval for intake correction

- **Status:** Accepted
- **Area:** People, roles, permissions, and approvals
- **Builds on:** System-wide / SYS-001, Area 5 / DEC-006,
  Area 10 / DEC-004, Area 10 / DEC-010

Only a `STORE_SUPERVISOR` may propose the correction or reversal of an
erroneous stock-creation or intake transaction. A different person holding an
applicable `STORE_SUPERVISOR` assignment shall approve or reject the exact
correction proposal.

The proposal shall identify:

- the original creation or intake transaction;
- the exact inventory units or quantity affected;
- the proposed compensating quantity and value effects;
- the correction reason; and
- any supporting reference supplied.

Approval, rejection, and withdrawal shall be append-only events retaining the
actor, exact time, proposal version, and reason. The same person shall not
propose and approve through another account, role assignment, or delegation. A
material proposal change shall create a new version and invalidate the earlier
approval.

Before applying an approved correction, the system shall lock and revalidate
the original transaction and affected current state. A simple reversal shall be
blocked when later dependent activity exists, as required by Area 5 / DEC-006.
The error shall then use the applicable linked corrective workflows without
rewriting those later events.

The correction's value effect shall reverse or compensate for the original
intake value mechanically. A separate decision to revalue stock shall continue
to require `FINANCE_SUPERVISOR` authority under Area 10 / DEC-013.

##### Reason

Central Store owns the integrity of institutional intake, but permitting one
Store Supervisor to both create and independently erase its current effect
would weaken that control. A second Store Supervisor confirms the correction
while append-only proposal, decision, and compensating events preserve the
original mistake and every action taken to correct it.

#### DEC-018: Keep institution-wide catalogue mutation separate from access root

- **Status:** Accepted
- **Area:** People, roles, permissions, and approvals
- **Builds on:** Area 1 / DEC-003, Area 10 / DEC-002,
  Area 10 / DEC-003, Area 10 / DEC-008, Area 10 / DEC-010

Active catalogue items, categories, base units, and category-attribute
definitions shall be readable by authenticated application users. Mutation of
those institution-wide definitions shall require effective `catalogue.manage`
authority resolved at the institute root organizational unit. A grant scoped
only to a department or sub-department shall not change definitions used by the
whole institute.

Technical `access.root` authority shall not imply `catalogue.manage` authority.
The Master Admin may receive catalogue authority only through a separate
effective business-role assignment, like any other person. Successful catalogue
mutations shall retain the exact effective permission and resolved
organizational authorization context established by Area 10 / DEC-003.

##### Reason

Catalogue definitions are shared institutional facts rather than departmental
configuration, so lower-scoped mutation would affect users outside the actor's
authority. Authenticated read access lets ordinary inventory users select and
understand the shared definitions, while the separate business permission
preserves the accepted boundary between technical access administration and
stock authority.

### Area 11 — Reporting, Search, Audit Output, and Exporting

#### DEC-001: Provide scoped global search using known stock terms

- **Status:** Accepted
- **Area:** Reporting, search, audit output, and exporting
- **Builds on:** Area 4 / DEC-002, Area 4 / DEC-003,
  Area 4 / DEC-004, Area 4 / DEC-005, Area 4 / DEC-007,
  Area 10 / DEC-003

V1 shall provide one permission-scoped global search across:

- catalogue codes;
- inventory-unit codes;
- current and historical institute asset numbers; and
- catalogue item names and descriptive keywords.

Exact domain-code and asset-number matches shall be ranked before keyword
matches. Results shall identify their record type and resolve to the canonical
dynamic route for that record. A historical identifier match shall visibly
indicate that the identifier has been superseded.

V1 shall not provide manufacturer-serial-number search, QR scanning, or barcode
search. Search results shall not reveal records outside the user's effective
organizational authority.

##### Reason

Known codes and item words cover the institute's practical lookup paths without
requiring hardware or unreliable serial-number entry. Direct resolution to
canonical records keeps search separate from routing while respecting the same
authorization boundary as every other view.

#### DEC-002: Start with five predefined report families

- **Status:** Accepted
- **Area:** Reporting, search, audit output, and exporting
- **Builds on:** Area 2 / DEC-001, Area 3 / DEC-005,
  Area 6 / DEC-006, Area 7 / DEC-001, Area 8 / DEC-006,
  Area 9 / DEC-006, Area 9 / DEC-007, Area 10 / DEC-003

V1 shall provide these predefined report families:

1. **Current stock register:** current quantities or units, condition,
   availability, custody, holder, location, and permitted value fields.
2. **Final stock-take report:** one closed exercise's expected and observed
   stock, variance, findings, organizational totals, exceptions, verification
   participants, and finalization details.
3. **Movement and accountability report:** requests, issues, transfers, returns,
   and loans with their parties, accountability dimensions, states, dates, and
   outstanding receipt.
4. **Condition and exception register:** damage, missing, confirmed loss,
   recovery, repair, disposal, and unresolved discrepancy cases.
5. **Finance stock summary:** valuation completeness, current stock value,
   write-off, reinstatement, and disposal financial outcomes without becoming
   an accounting statement.

The final stock-take report may compare against a previous closed exercise only
when the scopes are sufficiently comparable. Any material scope difference
shall be disclosed rather than hidden behind a previous-total figure.

The final report shall improve rather than reproduce defects in the supplied
manual report. It shall use explicit expected, observed, variance, condition,
availability, and value fields instead of duplicated quantity columns,
free-text condition codes, or unsupported totals.

##### Reason

Five fixed report families cover the institute's current accountability,
stock-taking, movement, exception, and financial-summary needs without creating
a general report-building product. Normalized fields and system-derived totals
remove the ambiguity that makes the current manual report difficult to audit.

#### DEC-003: Provide entity timelines and a scoped global audit log

- **Status:** Accepted
- **Area:** Reporting, search, audit output, and exporting
- **Builds on:** System-wide / SYS-001, Area 4 / DEC-006,
  Area 10 / DEC-003, Area 10 / DEC-004

Every catalogue item, inventory unit, movement, case, financial decision, and
stock-take exercise shall provide a chronological read-only timeline showing
the event, actor, effective role assignment, time, reason, relevant
before-and-after facts, and linked transaction.

Users with the applicable audit permission shall also receive a global audit
log filterable by actor, period, event type, organizational unit, and domain
code. Both entity and global audit views shall respect the user's effective
scope and shall not create a reporting route around protected operational or
financial data.

##### Reason

Entity timelines answer ordinary accountability questions in context, while a
scoped global log supports institutional investigation. Reusing the immutable
domain history avoids a separate editable audit record and keeps authorization
consistent with normal views.

#### DEC-004: Use fixed report filters rather than a custom report builder

- **Status:** Accepted
- **Area:** Reporting, search, audit output, and exporting
- **Builds on:** Area 1 / DEC-003, Area 2 / DEC-001,
  Area 3 / DEC-001, Area 3 / DEC-005, Area 7 / DEC-001,
  Area 10 / DEC-003, Area 11 / DEC-002

Each report shall expose only the filters relevant to that template. The
initial filter set shall include, where applicable:

- organizational unit and optional descendants;
- physical location and optional descendants;
- catalogue category or item;
- fixed or consumable stock type;
- condition, loss, availability, or workflow state; and
- a date period.

Users may select the report scope and applicable sections; they shall not design
arbitrary queries, joins, calculations, columns, or layouts in V1.

##### Reason

Fixed filters allow users to direct a report to what they need instead of
printing everything, while keeping each result understandable, testable, and
safe. A custom builder would add considerable interface, authorization,
validation, and support work without a confirmed V1 need.

#### DEC-005: Export reproducible PDF and Excel reports

- **Status:** Accepted
- **Area:** Reporting, search, audit output, and exporting
- **Builds on:** Area 9 / DEC-006, Area 9 / DEC-009,
  Area 11 / DEC-002, Area 11 / DEC-003, Area 11 / DEC-004

V1 shall provide:

- PDF for formal, printable reports; and
- Excel for tabular review and analysis.

V1 shall not provide Word export. Every displayed and exported report shall
state its report type, selected scope and filters, applicable `as at` time,
generating account, and generation time.

A live report shall be visibly labelled with its generation time and may change
when regenerated from later current data. A finalized stock-take report shall
be reproduced from its immutable closed snapshot and shall not change because
later stock activity or post-closure findings occurred.

PDF and Excel output shall be generated from the same authorized report query
and normalized result model as the on-screen report so their figures do not
drift independently.

V1 shall defer:

- a custom report designer;
- drag-and-drop columns or formulas;
- scheduled or emailed reports;
- saved custom report configurations;
- complex dashboards and charts;
- full audit-evidence packages; and
- trend analytics beyond a basic, disclosed stock-take comparison.

##### Reason

PDF supports the institute's formal reporting practice, while Excel supports
practical tabular analysis. Shared report data and immutable closed snapshots
make exports reproducible without multiplying business logic. Explicit
deferrals protect the V1 timeline from becoming a business-intelligence project.

#### DEC-006: Show monetary values within existing stock-access scope

- **Status:** Accepted
- **Area:** Reporting, search, audit output, and exporting
- **Builds on:** Area 8 / DEC-001, Area 9 / DEC-002,
  Area 10 / DEC-003, Area 10 / DEC-013, Area 11 / DEC-002,
  Area 11 / DEC-003, Area 11 / DEC-005

V1 shall not require a separate permission merely to view monetary values. Any
authenticated user authorized to view a stock record may view its applicable
unit or pooled value, total value, and other monetary fields. Value visibility
shall follow the user's existing stock-record scope and shall not expose other
departments, records, or financial actions that the user is not otherwise
authorized to access.

Viewing a monetary value shall not grant authority to enter a valuation,
revalue stock, approve repair expenditure, write off, reinstate, sell, donate,
or perform another financial action. Those actions shall continue to require
their established permissions and approval separation.

The partially blind first-count and recount interfaces shall hide any value or
derived total that would reveal the expected quantity before the counter
submits the observation. This is a stock-take integrity control rather than a
financial-confidentiality rule. After submission, ordinary scoped visibility
may apply.

PDF and Excel exports shall use the same scoped value visibility as their
on-screen report and shall identify the generating account, generation time,
and selected scope. Supporting-document attachments shall use the separate
record and evidence-access controls in Area 16 / DEC-005 because permitting a
user to see a monetary figure shall not automatically authorize access to every
document behind it.

##### Reason

Visible values make the financial significance of stock responsibility,
discrepancies, and losses clear to authorized officers and keep reports simple
and consistent. Existing record scope prevents the rule from becoming
institution-wide access, while blind-count hiding protects independent physical
observation and separate action permissions preserve Finance authority.

### Area 12 — Notifications and Automation

#### DEC-001: Use a persistent notification inbox with SSE and selective email

- **Status:** Accepted
- **Area:** Notifications and automation
- **Builds on:** System-wide / SYS-001, Area 3 / DEC-004,
  Area 6 / DEC-009, Area 7 / DEC-009, Area 10 / DEC-005,
  Area 10 / DEC-016

A domain transaction that requires notification shall atomically create a
persistent notification or transactional-outbox record. Notification delivery
shall not depend on the initiating request remaining open or on an SSE client
being connected.

V1 shall use:

- **SSE** to signal new or changed in-app notifications to connected,
  authenticated clients;
- a persistent in-app inbox as the durable source that clients fetch on initial
  load and after reconnection; and
- **SMTP email** for urgent or escalated alerts and for transactional messages
  required to participate without an active session, including account
  recovery and non-user recipient-confirmation challenges.

An SSE event may carry the notification identifier and minimal refresh
information; it shall not replace the stored notification or expose data beyond
the connected user's scope.

Email shall be processed by a queued worker. Delivery attempts shall use stable
idempotency keys and retain success or failure history so retries do not create
unbounded duplicate messages.

##### Reason

SSE provides timely browser updates but cannot guarantee delivery to a
disconnected client. A durable inbox and outbox preserve work across
disconnects and process failures, while selective email reaches urgent or
external participants without turning every routine event into inbox noise.

#### DEC-002: Use three notification severities and safe action links

- **Status:** Accepted
- **Area:** Notifications and automation
- **Builds on:** Area 10 / DEC-003, Area 10 / DEC-004,
  Area 12 / DEC-001

V1 shall use these notification severities:

| Severity          | Delivery behavior                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| `INFORMATION`     | Persistent in-app notification and SSE signal                                                    |
| `ACTION_REQUIRED` | Immediate in-app/SSE; email if the underlying work remains outstanding at its reminder threshold |
| `URGENT`          | Immediate in-app/SSE and immediate email                                                         |

Where an action is available, the notification may provide a button such as
**Review request**, **Confirm receipt**, **Start investigation**, **Record
return**, or **Approve/Reject**. The button shall open the exact current
workflow and proposal version. It shall not itself perform a sensitive action,
bypass a reason field, reuse stale approval, or avoid a fresh permission and
business-state check.

If the work was completed, replaced, expired, or the viewer lost authority
before opening the notification, the target page shall explain that current
state rather than attempting the old action.

An authenticated email button shall return the user through login to the
applicable workflow. A no-login recipient-confirmation button remains governed
by its transaction-specific, expiring, single-use challenge and shall first show
the details required for confirmation or rejection.

Reading or dismissing a notification shall not resolve its underlying business
task. Notification creation, delivery, failure, read, and business-resolution
history shall remain auditable; mutable unread counts may be maintained as
rebuildable projections.

##### Reason

Action links reduce navigation friction for non-technical users, while opening
the live workflow prevents a stale notification from becoming an authorization
shortcut. Separating read state from business resolution keeps notification
convenience from changing stock or approval facts.

#### DEC-003: Seed fixed V1 escalation rules

- **Status:** Accepted
- **Area:** Notifications and automation
- **Builds on:** Area 6 / DEC-003, Area 6 / DEC-004,
  Area 6 / DEC-009, Area 7 / DEC-009, Area 9 / DEC-009,
  Area 10 / DEC-005, Area 10 / DEC-011, Area 10 / DEC-013,
  Area 12 / DEC-001, Area 12 / DEC-002

V1 shall seed these calendar-day escalation defaults:

| Event                                  | Initial delivery                                                                | Reminder and escalation                                                                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Missing stock reported                 | `URGENT` to the current holder and responsible Stock Supervisor                 | Escalate after 1 day when no investigation has been assigned                                                                                      |
| Confirmed loss                         | `ACTION_REQUIRED` to responsible Stock and Finance Supervisors                  | Remain outstanding until write-off or physical recovery; recovered stock additionally requires reinstatement only when it was already written off |
| Movement awaiting source release       | `ACTION_REQUIRED` to the source officer                                         | Email after 1 day; notify a broader-scoped responsible supervisor after 3 days                                                                    |
| Movement awaiting receipt              | Recipient challenge where required and `ACTION_REQUIRED` in-app                 | Email after 1 day; notify the destination Stock Supervisor after 3 days                                                                           |
| Receipt discrepancy                    | `ACTION_REQUIRED` to Store and destination Stock Supervisors                    | Email after 1 day; notify an institution-scoped Stock Supervisor after 3 days                                                                     |
| Loan approaching return                | Notify borrower and custodial Stock Supervisor 3 days before the due date       | Email on the first overdue day; notify a broader-scoped Stock Supervisor after 7 overdue days                                                     |
| Pending reloan request                 | `ACTION_REQUIRED` to the custodial Stock Supervisor                             | The request shall not suspend or hide overdue-loan escalation                                                                                     |
| Low consumable stock                   | Notify Store Supervisor when available balance crosses its configured threshold | Email only at zero or a separately configured critical level                                                                                      |
| Pending allocation or unknown location | `ACTION_REQUIRED` to the responsible Stock Supervisor                           | Email after 1 day; notify a broader-scoped Stock Supervisor after 3 days                                                                          |
| Finance decision required              | `ACTION_REQUIRED` to the applicable Finance Supervisor                          | Email after 2 days; notify another appropriately scoped Finance Supervisor after 5 days                                                           |
| Delegation approaching expiry          | Notify delegator and delegate 1 day before expiry                               | Expiry remains synchronously enforced regardless of delivery                                                                                      |
| Stock-take assignment or recount       | `ACTION_REQUIRED` to the assigned Stock Taker                                   | Email only when an applicable configured exercise deadline is approaching or missed                                                               |

A low-stock threshold alert shall be created when the balance crosses from above
to at or below the threshold. It shall not repeat after every transaction while
the balance remains low. The rule may be armed again after the balance rises
above the threshold.

##### Reason

The seeded rules prioritize missing stock, unconfirmed custody, overdue loans,
and unresolved financial or physical responsibility without producing email
for every normal event. Calendar-day defaults avoid introducing holiday and
business-calendar administration into V1 and may be adjusted after observing
the institute's actual response patterns.

#### DEC-004: Escalate responsibility without changing authority

- **Status:** Accepted
- **Area:** Notifications and automation
- **Builds on:** Area 10 / DEC-003, Area 10 / DEC-008,
  Area 10 / DEC-014, Area 10 / DEC-016, Area 12 / DEC-003

An escalation shall notify another currently authorized person; it shall not
grant permission, approve, reject, confirm, reassign, cancel, or otherwise
change the underlying workflow.

Each escalation level shall normally send once. V1 shall not send indefinite
daily email loops. Reminders shall stop when the underlying work is completed,
cancelled, superseded, or otherwise resolved by its domain workflow—not merely
when somebody reads the notification.

Recipients for a later escalation shall be resolved from current active role
assignments and scopes at the time that escalation is produced. The
notification history shall preserve who was actually targeted and why.

Operational events shall escalate through the applicable Store or Stock
Supervisor authority; financial events through Finance Supervisor authority;
and access/security events through Master Admin. Master Admin shall not receive
ordinary stock escalation merely because it is the access root. If no eligible
business-role recipient exists, the system shall notify Master Admin that an
authority assignment is missing so access can be corrected without treating
Master as the business decision-maker.

Email content shall contain only the detail necessary to identify the action
and direct the recipient to the system. Transaction-specific no-login
confirmation messages may show the additional details required by Area 3 /
DEC-004.

##### Reason

Escalation should expose unattended responsibility, not become an alternative
approval path. Current-role routing handles staffing changes, single delivery
per level avoids spam, and the unroutable-authority alert lets Master repair
access without inheriting the stock decision.

### Area 13 — Initial Data Capture and Data Quality

#### DEC-001: Capture opening stock through Store-controlled active intake

- **Status:** Accepted
- **Area:** Initial data capture and data quality
- **Builds on:** Area 5 / DEC-001, Area 5 / DEC-002,
  Area 5 / DEC-003, Area 5 / DEC-004, Area 10 / DEC-010

V1 shall not introduce a separate data-migration, temporary-inventory, or
opening-data acceptance workflow.

Opening inventory shall be manually created by a `STORE_SUPERVISOR` through
the established stock-intake process with `OPENING_STOCK` provenance. The
Store Supervisor may perform this work at the central store or travel to the
department or other physical location where the stock is held. Central Store
control therefore does not require stock to be transported to the store before
it can be catalogued and recorded.

Successful opening capture shall create active stock immediately under the
existing intake rules. Opening entries may be grouped into identifiable
capture batches so the system can report who recorded them, when they were
recorded, where the work occurred, and which opening-capture work remains.

The Store Supervisor shall record the evidence basis used for the entry, such
as:

- direct physical observation;
- a current departmental record or accountable-officer statement;
- a historical report; or
- a combination of those sources.

Historical reports may support identification and provenance, but shall not
independently cause the system to create stock that the Store Supervisor has
not observed during the opening-capture process. Later independent checking
and reconciliation shall use the established physical stock-taking workflow
from Area 9 rather than a second opening-data approval process.

##### Reason

The Store Supervisor is already the single accountable intake authority and
can operate as a mobile control point when stock is held outside the central
store. Reusing active intake and stock-taking avoids parallel provisional-stock
states while preserving responsibility, source evidence, and independent
verification.

#### DEC-002: Derive data-quality work from unresolved domain facts

- **Status:** Accepted
- **Area:** Initial data capture and data quality
- **Builds on:** System-wide / SYS-001, Area 1 / DEC-006,
  Area 3 / DEC-007, Area 4 / DEC-001, Area 4 / DEC-003,
  Area 4 / DEC-006, Area 7 / DEC-001, Area 8 / DEC-001,
  Area 8 / DEC-005, Area 13 / DEC-001

V1 shall provide a data-quality worklist derived from unresolved facts already
recorded in the applicable domain records. It shall include relevant cases such
as:

- placeholder catalogue items awaiting more precise identification;
- unknown value or functional condition;
- unverified, conflicting, or reviewable duplicate external identifiers;
- inventory using an authorized unknown-location exception;
- incomplete recommended source references; and
- other explicit incomplete-data states established by the domain model.

The worklist shall not become a separate source of truth or permit a user to
hide an underlying problem by dismissing or manually marking the warning
resolved. An entry shall leave the active worklist only when the underlying
fact is corrected, verified, superseded, or otherwise resolved through its
established append-only domain process.

The system shall preserve the original incomplete or conflicting record and
the actor, reason, and time of its eventual resolution. Rebuildable worklist
and summary projections may be maintained for efficient display.

Validation failures already defined as hard conflicts, including reuse of an
institute asset number, shall continue to block creation. The worklist applies
to explicitly permitted uncertainty; it does not weaken uniqueness,
authorization, or intake validation rules.

##### Reason

One derived worklist makes incomplete opening data visible without inventing a
parallel review workflow for every kind of problem. Resolving the underlying
fact keeps the warning, current state, reports, and audit history consistent
and prevents users from clearing warnings without correcting the inventory
record.

### Area 15 — Non-functional and Deployment Requirements

#### DEC-001: Deploy one public, single-institution system on a managed VPS

- **Status:** Accepted
- **Area:** Non-functional and deployment requirements
- **Builds on:** Area 10 / DEC-007, Area 12 / DEC-001

V1 shall be a single-institution deployment rather than a multi-tenant service.
It shall be reachable through the public internet, but shall have no public
account-registration path. Access shall remain limited to accounts created
under the established Master Admin process and to controlled no-login
transaction challenges.

V1 shall require an online connection. Offline data capture, offline conflict
resolution, and later synchronization are outside scope.

The production application shall run on an institute-controlled VPS using
Docker, Traefik, and Dokploy. Local development, staging, and production shall
be distinct environments. Staging and production shall use separate servers,
databases, secrets, domains, storage namespaces, and outbound-message
configuration so testing cannot act on production data or recipients.

The developer shall initially configure and deploy production. The institute's
ICT officer shall manage the server and routine infrastructure health after
handover, while application deployments remain the developer's responsibility
under the applicable maintenance arrangement.

##### Reason

One deployment matches the institute's current ownership model and avoids
multi-tenant isolation work. Public access supports officers working across
locations, while separate staging protects production migrations, workflows,
queues, and messages during testing. Excluding offline synchronization keeps
V1 within a manageable delivery scope.

#### DEC-002: Use hardened named access and controlled password authentication

- **Status:** Accepted
- **Area:** Security and production access
- **Builds on:** Area 10 / DEC-006, Area 10 / DEC-007,
  Area 10 / DEC-008, Area 10 / DEC-014

Production server administration shall use:

- named, non-shared, non-root operating-system users;
- SSH public-key authentication;
- disabled remote root login and disabled SSH password authentication;
- a firewall exposing only required services;
- no public database or internal queue port; and
- separately controlled production secrets.

The initial developer and ICT-officer server accounts shall remain separate.
At accepted delivery and handover, the developer's standing server account
shall be removed unless an active, separately contracted support arrangement
explicitly requires named, least-privilege access. Temporary developer access
during deployment and UAT correction belongs to delivery and shall not become
unrecorded ongoing access. Support shall never use the ICT officer's account or
private key. The institute shall own the VPS, domain, storage,
deployment-platform, SMTP, and recovery credentials.

Application access shall use the password-setup, recovery, rate-limiting,
account-revocation, and session-invalidation controls established in Area 10 /
DEC-007. V1 shall not require MFA or scheduled password expiry. Business-risk
controls shall remain in the established scoped permissions, independent
approvals, recipient confirmations, append-only audit history, and physical
stock verification.

##### Reason

Public reachability increases the consequence of a stolen password or
infrastructure credential. Named access preserves accountability, removal of
unused standing access reduces exposure after handover, and controlled password
and recovery rules provide a proportionate V1 authentication boundary. The
domain's independent approvals and physical reconciliation protect sensitive
stock actions without turning the application into a higher-assurance financial
authentication system.

#### DEC-003: Separate operational retention from restorable backups

- **Status:** Accepted
- **Area:** Backup, recovery, and retention
- **Builds on:** System-wide / SYS-001, Area 11 / DEC-005

Cloudflare R2 shall be the off-server destination for automated production
backups. Backup credentials shall be scoped to the applicable backup
destination and kept separate from ordinary application access.

The initial backup schedule and rolling retention shall be:

- daily database backups retained for 30 days;
- weekly database backups retained for 12 weeks;
- monthly database backups retained for 12 months; and
- quarterly restoration tests whose result, actor, time, and corrective action
  are recorded.

The institute may require longer retained recovery points after confirming its
policy. R2 lifecycle and retention-lock controls may enforce the approved
schedule. Production database backups and Dokploy configuration backups shall
both be covered, but shall remain distinguishable restoration units.

Backup retention is not the same as retention of queryable application records
or supporting evidence. Domain and audit records shall remain governed by
SYS-001 and the institute's eventual record-retention policy. A database backup
shall not be treated as the only archive of records that the institute must be
able to search or report.

##### Reason

Off-server recovery protects against loss of the VPS, while rolling recovery
points avoid retaining every complete database copy for the full operational
record lifetime. Scheduled restore testing verifies recoverability rather than
assuming that successful upload alone constitutes a usable backup.

#### DEC-004: Design for the initial institution scale and define baseline operations

- **Status:** Accepted
- **Area:** Performance, monitoring, and operational support
- **Builds on:** Area 12 / DEC-001

V1 shall initially support one institute, no more than approximately 100 named
users, and a planning peak of 20–50 concurrent users, primarily Stock Takers
and Store Supervisors during intake or stock-taking activity.

The initial production VPS recommendation shall use approximately 8–12 GB RAM
and 100 GB NVMe storage, subject to the selected provider's CPU allocation and
pre-production verification. A separate staging VPS shall not consume
production capacity. Application evidence files and off-server backups shall
not rely on production disk as their sole retained copy.

Every production handover shall include, regardless of an ongoing support
contract:

- external availability checking;
- CPU, memory, and disk-space alerts;
- application and container health checks;
- backup-success and backup-failure visibility;
- application error logging; and
- deployment, health-check, backup, and restoration runbooks for ICT.

The implementation engagement shall include delivery of a working accepted V1,
critical testing, UAT correction, production deployment, and handover. It shall
not include post-acceptance SRE operations, proactive monitoring, patching,
routine backup verification, retained developer access, or ongoing maintenance.
Those duties may be offered under a separately defined support agreement.
Reproducible failures of the delivered system to satisfy the accepted V1
baseline remain delivery defects; new features and scope changes are not
defects and shall be estimated separately.

##### Reason

The capacity envelope is modest but must accommodate concentrated counting and
intake activity. A mandatory operational baseline prevents a handover with no
failure visibility, while separating accepted delivery defects, ongoing
support, and new development makes responsibilities and charges explicit.

### Area 16 — Technical Design and Architecture

#### DEC-001: Use a typed monorepo with a SvelteKit application boundary

- **Status:** Accepted
- **Area:** Technical design and architecture
- **Builds on:** Area 10 / DEC-007, Area 11 / DEC-001,
  Area 15 / DEC-001

The implementation shall use a pnpm monorepo containing:

- an AdonisJS API application; and
- a SvelteKit application using Svelte 5 and shadcn-svelte.

AdonisJS Tuyau shall generate the typed API registry consumed within the
monorepo so request, validation, route, error, and response types remain tied to
the API definition.

Ordinary browser reads and writes shall use the established SvelteKit boundary:

- reads through SvelteKit server load functions;
- writes through SvelteKit form actions;
- a request-scoped, server-only Tuyau client;
- incoming authentication cookies forwarded to AdonisJS; and
- API `Set-Cookie` responses propagated back to the browser.

The browser shall not ordinarily call the AdonisJS resource API directly.
AdonisJS shall remain the sole authority for runtime validation, authorization,
business rules, transactions, and persistence even though compile-time types
are shared.

The deliberate exception is Transmit SSE. The browser shall connect directly
to the AdonisJS Transmit routes rather than proxy a long-lived event stream
through SvelteKit. The applicable routes and channels shall use authentication
and explicit channel authorization.

##### Reason

The system currently has one user application and no justified independent API
consumer. The monorepo and Tuyau prevent contract drift, while SvelteKit keeps
the browser-facing request and cookie flow consistent. Direct Transmit avoids
reimplementing browser streaming, buffering, reconnection, and disconnect
handling in the SvelteKit server.

#### DEC-002: Run the API and native queue worker from one image as separate services

- **Status:** Accepted
- **Area:** Technical design and architecture
- **Builds on:** Area 12 / DEC-001, Area 12 / DEC-003,
  Area 15 / DEC-001

Background processing shall use AdonisJS's native `@adonisjs/queue` package
with its Lucid database adapter. PostgreSQL shall store the queue and schedule
tables. The worker shall process explicitly named queues; its production
command shall name every active queue because an unqualified worker drains only
the default queue.

Production shall run two long-lived AdonisJS services from the same compiled
Docker image:

- the HTTP API process, using the Dockerfile's normal server command; and
- the queue-worker process, using Dokploy's command override to start
  `node bin/console.js queue:work` with the applicable named queues.

The command override shall be the worker container's main process, not a
one-time command run after the server starts. API and worker shall therefore
share one image and application version while retaining separate containers,
processes, logs, restart lifecycles, and health monitoring. Both services shall
receive the environment variables needed by the code they execute.

Migrations shall run as an explicit deployment step against the same built
image before the new application processes serve traffic; they shall not be
hidden inside each container's startup command.

##### Reason

Email, notification escalation, scheduled expiry, report work, and other
failure-prone tasks must not hold open browser requests. One image prevents the
HTTP and worker code from drifting, while separate processes let Dokploy
restart and monitor each role independently. The database adapter fits the
expected workload and preserves queue state with the existing PostgreSQL
operational model.

#### DEC-003: Use Redis only as Transmit's cross-process message bus

- **Status:** Accepted
- **Area:** Technical design and architecture
- **Builds on:** Area 12 / DEC-001, Area 16 / DEC-002

The HTTP API process owns browser SSE connections, while the queue worker may
create notifications or other events that must signal those clients. Transmit
shall therefore use its Redis transport to carry broadcasts between the worker
and HTTP processes.

Redis shall not be the queue or atomic-lock store in V1. Its accepted purpose is
the Transmit cross-process bus. PostgreSQL remains the durable source of
notification and workflow truth; an SSE broadcast is a best-effort signal to
refetch current data. Failure of Redis or a disconnected client shall not erase
the persistent notification or roll back the completed business transaction.

The deployment shall:

- configure the same Transmit Redis connection for the HTTP and worker
  services;
- import the Redis-specific Transmit transport;
- protect private subscription channels with authentication and channel
  authorization;
- allow the required credentialed browser origin; and
- configure Traefik not to compress `text/event-stream`.

##### Reason

Even one HTTP container and one worker container are separate AdonisJS
processes. A process-local broadcast from the worker cannot reach connections
held by the HTTP server. Redis supplies that missing live transport without
moving queues, locks, notifications, or business state out of PostgreSQL.

#### DEC-004: Apply database transactions, row locks, and atomic locks at their proper scopes

- **Status:** Accepted
- **Area:** Technical design and architecture
- **Builds on:** System-wide / SYS-001, Area 5 / DEC-003,
  Area 6 / DEC-003, Area 6 / DEC-005, Area 7 / DEC-022,
  Area 8 / DEC-004, Area 9 / DEC-005

PostgreSQL shall be the primary database and AdonisJS Lucid the ORM.

Multi-write domain operations shall normally use managed Lucid transactions so
success commits and thrown errors roll back the complete unit of work. Models
and queries participating in the operation shall use the same transaction
client.

When a decision depends on current mutable state, the transaction shall:

1. select the applicable authoritative row or rows with `FOR UPDATE`;
2. read and revalidate the current quantity, state, version, or authority;
3. append the new domain record or correction; and
4. update any rebuildable current-state projection before committing.

The implementation may additionally use AdonisJS `@adonisjs/lock` with its
database store for cross-process critical sections that are not adequately
expressed by one row lock, including bounded idempotent job execution or
coordination spanning API and worker processes.

An atomic lock shall not replace the database transaction or its final
`FOR UPDATE` revalidation. Row locks protect the database state being changed;
named atomic locks coordinate competing processes around a wider operation.
Lock keys, time-to-live, acquisition timeout, retry behavior, and idempotency
checks shall be explicit for each use.

##### Reason

The established decisions repeatedly require lock-read-revalidate-append
behavior. Managed transactions protect atomic writes, row-level locks serialize
competing changes to the same stock state, and named database locks cover
cross-process work that has no single suitable row. Keeping the scopes distinct
prevents a successful lock acquisition from being mistaken for proof that the
underlying stock state is still valid.

#### DEC-005: Store private PDF and DOCX evidence in Cloudflare R2

- **Status:** Accepted — confirmed with the institute
- **Area:** Technical design and architecture
- **Builds on:** System-wide / SYS-001, Area 5 / DEC-004,
  Area 7 / DEC-007, Area 7 / DEC-015, Area 8 / DEC-006,
  Area 9 / DEC-004, Area 10 / DEC-013, Area 15 / DEC-003

V1 shall permit authorized users to upload supporting evidence to applicable
stock workflows. Accepted document formats shall be limited to:

- PDF (`application/pdf`); and
- DOCX
  (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`).

The application shall validate the declared extension, MIME type, and file
signature rather than trusting the client-supplied filename alone. The
configured maximum file size shall be enforced at the application and proxy
boundaries.

Evidence files shall be stored privately in Cloudflare R2. Production
evidence, staging evidence, and infrastructure backups shall use separate
namespaces and appropriately scoped credentials and retention policies. An
evidence object shall not be exposed through a permanent public URL.
Authorized access shall be mediated by the application or a short-lived signed
operation after a fresh record-scope authorization check.

PostgreSQL shall retain the immutable attachment metadata and domain link,
including:

- an opaque storage key;
- original filename;
- controlled document or evidence type where applicable;
- MIME type and byte size;
- content checksum;
- uploader and upload time; and
- the exact intake, assessment, case, decision, correction, or other domain
  record the document supports.

An attachment shall supplement rather than replace the workflow's structured
facts, reason, actor, time, and approval. It shall not be silently overwritten
or destructively removed. A mistaken or obsolete attachment shall be marked
entered in error or superseded through an append-only record while preserving
its audit relationship and applying the institute's eventual evidence-retention
policy.

##### Reason

The institute requires the underlying reports, approvals, assessments, and
handover evidence to remain available with the stock decision they support.
Private object storage avoids placing binary files in PostgreSQL or relying on
one VPS disk. Narrow formats, independent authorization, immutable metadata,
and separate storage namespaces preserve the audit boundary without turning
the stock application into a general-purpose document repository.

#### DEC-006: Test critical domain behavior continuously with Japa

- **Status:** Accepted
- **Area:** Technical design and architecture
- **Builds on:** System-wide / SYS-001, Area 10 / DEC-003,
  Area 15 / DEC-001, Area 16 / DEC-004

The initial API test stack shall use Japa with its Japa/AdonisJS-native plugins
and assertions. V1 development shall not begin with Jest, `@japa/expect`,
Chai, Mocha, or another parallel assertion/test stack. An additional testing
library may be proposed later only when a concrete test cannot be expressed
cleanly with the established Japa setup; its purpose and trade-off shall be
explained before installation.

AdonisJS API-client, authentication, and Lucid database assertion plugins shall
support functional tests of real application boundaries.

Automated testing shall be written alongside the applicable feature rather
than deferred until institutional use. V1 shall prioritize behavior capable of
changing stock, money, custody, possession, workflow authority, or audit
history, including:

- permissions, organizational scope, delegation, and account revocation;
- intake, duplicate rejection, correction, and reversal;
- quantity sufficiency and prevention of negative balances;
- movement, issue, loan, return, release, and receipt transitions;
- locked concurrent changes and idempotent retries;
- append-only correction and history preservation;
- condition, damage, loss, recovery, repair, write-off, reinstatement, and
  disposal transitions;
- stock-take counting, investigation, reconciliation, and closure; and
- integer-minor-unit valuation calculations.

Pure unit tests shall be used where a calculation or transition rule can be
tested independently. Functional tests against PostgreSQL shall cover
transactional workflows and their permitted and rejected paths. Exhaustive
visual-component automation is not a V1 requirement; responsive interfaces and
lower-risk presentation behavior may use focused manual testing.

Before production, representative Store Supervisor, Stock Supervisor, Finance
Supervisor, Stock Taker, recipient, and Master Admin scenarios shall undergo
user acceptance testing in staging. UAT feedback that corrects an agreed
requirement shall be distinguished from a new scope request, and corrected
flows shall be retested before acceptance.

##### Reason

The strongest risks are incorrect state transitions, concurrent balance
changes, unauthorized decisions, and damaged audit history. Focused Japa
functional tests protect those rules while they are being built and reduce
regression risk as later workflows build on earlier ones. Staging UAT verifies
that the technically correct implementation also matches the institute's real
work.

#### DEC-007: Deliver the accepted online V1 by 31 October 2026

- **Status:** Accepted
- **Area:** Technical design and architecture
- **Builds on:** Areas 1–13, Area 15, Area 16 / DEC-001,
  Area 16 / DEC-002, Area 16 / DEC-005, Area 16 / DEC-006

The production-target date for the accepted V1 scope shall be
**31 October 2026**. Development shall proceed through demonstrable vertical
milestones covering:

1. application foundation, access, organization, catalogue, and role scope;
2. Central Store intake, opening capture, current inventory, and corrections;
3. movements, issues, custody, possession, loans, returns, and confirmations;
4. condition, damage, loss, recovery, repair, write-off, reinstatement,
   disposal, and their financial decisions;
5. stock-taking, reconciliation, reports, search, audit output, attachments,
   notifications, and the data-quality worklist; and
6. staging UAT, correction, production deployment, acceptance, and handover.

Critical automated tests and implementation documentation shall be produced
within each milestone rather than reserved for the end. Area 14 workflow
guidance and onboarding material shall be developed against the working
interfaces and refined during UAT as previously agreed.

The target assumes the accepted V1 remains bounded: it does not include offline
operation, multitenancy, procurement or accounting modules, QR/barcode
hardware, a custom report builder, or other previously deferred work. A new
material requirement shall be assessed explicitly for its effect on delivery
rather than silently entering the October commitment.

##### Reason

The institute's workflow and report sample show that a one-month build would
not provide a dependable starting system. The October target gives the
interdependent operational, financial, exception, stock-taking, and audit
workflows time to be implemented and verified while retaining a clear boundary
against unplanned expansion.
