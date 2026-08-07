# Web Architecture and Patterns

This is the chronological record of architectural and implementation patterns
adopted for `apps/web`. It records decisions and their reasons; code remains
the source for implementation details.

## D1 — SvelteKit is the browser-facing application boundary

**Decision.** The web package uses SvelteKit 2, Svelte 5 runes, TypeScript, and
Tailwind CSS 4. Ordinary API reads will run through server load functions and
writes through form actions.

**Why.** A server-only, request-scoped Tuyau client keeps the AdonisJS session
cookie and resource API behind the SvelteKit boundary while retaining
end-to-end generated types.

## D2 — One root pnpm workspace

**Decision.** The web application is the `web` package inside the repository's
single root pnpm workspace.

**Why.** A single workspace and lockfile keep the API registry link and all
shared tooling reproducible.

## D3 — API traffic uses a request-scoped server-only Tuyau client

**Decision.** Each SvelteKit request receives a new Tuyau client through
`event.locals`. Its base URL comes from the mandatory, server-only
`PRIVATE_API_URL`. The client forwards every incoming browser cookie to
AdonisJS and parses every API `Set-Cookie` header back through SvelteKit's
cookies API. Server load functions and form actions use this client; ordinary
browser code does not call REST endpoints directly.

The generated `api/registry` module remains the route-type authority. Vite
bundles that raw TypeScript registry during SSR, and the web TypeScript
configuration enables the decorators required by the shared AdonisJS types.

**Why.** A module-level API client would leak cookie state between concurrent
users or require every caller to repeat request context. Request scope keeps
sessions isolated and makes cookie propagation a single transport concern.
Routing REST through SvelteKit preserves the browser-facing BFF boundary while
Tuyau keeps requests tied to named AdonisJS routes at compile time.

## D4 — The application shell lives in a pathless route group

**Decision.** Authenticated-style application pages use the pathless `(app)`
route group and its responsive shadcn sidebar layout. The group changes layout
ownership without adding a URL segment. Its sidebar becomes off-canvas at
smartphone widths, its header remains visible while content scrolls, and its
content respects device safe areas. The nearest error page renders inside the
same shell.

Navigation contains only routes that actually exist. The initial shell links
only to Home; domain navigation will be introduced with the routes and
permission rules that make it real. Login, password recovery, recipient
challenges, and other flows that need a different frame can live outside the
group.

The installed shadcn dashboard demonstration remains in the repository for
selective later reuse. Its sample charts, tables, user, and navigation data are
not product behavior or accepted information architecture.

**Why.** A route group gives the application one reusable layout without
leaking an implementation name into public URLs. Keeping unauthenticated flows
outside it avoids conditional shell logic. Refusing placeholder destinations
prevents generated demonstration content from silently becoming product
navigation before authorization and user journeys are known.

## D5 — Dashboard drag-and-drop packages share one geometry type family

**Decision.** The retained shadcn dashboard uses
`@dnd-kit-svelte/svelte@0.1.6` with direct `@dnd-kit/abstract` and
`@dnd-kit/helpers` dependencies from the `0.2.4` family. The root pnpm
workspace overrides `@dnd-kit/geometry` to `0.2.4`.

**Why.** The Svelte adapter's published dependency graph otherwise installs
both geometry `0.1.21` and `0.2.4`. Their `Position` classes contain private
members and are therefore nominally incompatible even when their public shape
looks similar. Aligning the family fixes the dependency graph instead of
casting drag events or suppressing TypeScript. This reproduces the verified
MDP admin pattern.

## D6 — The web application has its own adapter-node image

**Decision.** The web Dockerfile builds from the monorepo root, compiles the
adapter-node server with access to the linked API Tuyau registry, and deploys
only production dependencies and the generated server into its runtime image.

**Why.** SvelteKit is a separate browser-facing runtime rather than another
command in the API container. Building from the root retains one reproducible
pnpm graph and allows Vite to consume `api/registry` without publishing a
shared types package.

## D7 — Product choice controls use the styled shadcn Select

**Decision.** Product-facing filters and forms use the Bits UI-backed shadcn
`Select` component when presenting controlled choices. Triggers fill their
available grid column at smartphone widths and open the scaffold's styled,
keyboard-accessible popover. A native select is used only when a product or
platform requirement explicitly calls for native operating-system behavior.

GET filter forms submit the selected value through a hidden named input so the
filter remains URL-addressable while the visible shadcn trigger owns the
interaction and presentation.

**Why.** Merely using a scaffold-provided native primitive does not preserve
the application's established visual language. The styled Select provides the
expected menu surface, spacing, focus behavior, and responsive width without
moving filtering into browser-to-API requests.

## D8 — Sidebar navigation dismisses the smartphone sheet

**Decision.** Links rendered inside the application sidebar close its mobile
sheet through the shared shadcn sidebar context before navigation. Desktop
sidebar state is unchanged.

**Why.** Closing the off-canvas navigation reveals the selected destination on
a smartphone. Using the sidebar's own context API keeps sheet state ownership
inside the scaffolded component.

## D9 — Access-impact writes preserve one reviewed server form

**Decision.** Organizational writes that require an access-impact review use
one SuperForm with named SvelteKit preview and mutation actions. The preview
action validates and returns the current form state together with the API's
impact response and fingerprint. The mutation action submits that exact
fingerprint, while the API remains responsible for recalculating impact and
rejecting stale state under its transaction lock.

The reviewed operation inputs determine whether a preview remains current.
Changing an input included in the API fingerprint clears the submitted
fingerprint and requires another review; unrelated fields do not manufacture
extra invalidation. Browser code never calculates affected access. System
permission and scope identifiers retain their API values and pass through a
shared presentation-label function only when rendered for users.

Successful previews open in a responsive confirmation dialog. Its assignment
list scrolls independently between a persistent summary and action footer, and
its confirmation button targets the owning form explicitly because dialog
content is portalled outside the form element. Closing the dialog leaves a
compact reviewed-state summary that can reopen the same current preview. When
confirmation temporarily replaces editable controls, hidden inputs preserve
the validated operation values in the final request. A successful mutation
closes its dialog; validation, domain, and stale-preview failures keep it open.

**Why.** A single form avoids copying mutable values between separate preview
and confirmation forms. Named server actions preserve progressive enhancement
and the browser-facing BFF boundary, while the fingerprint binds confirmation
to the authoritative hierarchy and assignment state the administrator saw.
Central presentation labels keep technical identifiers stable in code without
making users interpret internal vocabulary.

## D10 — Form snapshots are opt-in for non-sensitive administration

**Decision.** Authenticated administration pages may export Superforms'
`capture` and `restore` methods through a SvelteKit page snapshot when their
form state contains no credentials, credential links, personal identifiers,
or other sensitive values. Credential and personal-data forms do not receive
snapshots without a separate security review and explicit approval.

Access-impact result objects are not included in form snapshots. Restored
organizational form fields must obtain a fresh authoritative preview before a
mutation can be confirmed.

**Why.** Browser-history restoration improves navigation through ordinary
administrative workflows, but indiscriminately snapshotting every form would
retain passwords, reset tokens, personal data, or sensitive administrative
reasons longer than their immediate interaction requires. Keeping the feature
opt-in makes that persistence an explicit data-handling choice.

## D11 — Organizational lifecycle actions remain unit-specific and hierarchy-aware

**Decision.** Rename, reparent, archive, and restore are initiated from the
organizational-unit detail route. The institute is the sole root: it may be
renamed but cannot be reparented, archived, or restored. Departments may be
renamed, archived, and restored. Only active sub-departments may be reparented,
and the UI offers a preselected alternative from active departments while the
API remains authoritative for hierarchy validity.

Rename submits directly because it does not change organizational access.
Reparent, archive, and restore each use one operation-specific SuperForm with a
named preview action and final mutation action. Their server-issued impact and
fingerprint stay together through the responsive confirmation dialog. A
fingerprinted input change or stale response invalidates confirmation. Required
administrative reasons do not invalidate an otherwise current preview because
they are not part of effective-access calculation. Confirmation views preserve
the reviewed parent and reason in the submitted form even while their editable
controls are not rendered.

Lifecycle dialog forms do not opt into page snapshots because their audit
reasons may contain sensitive administrative context. Access-impact assignments
use one shared presentation component across creation and lifecycle workflows.

**Why.** Unit-specific actions keep structural context visible and prevent the
root or an ineligible descendant from being offered an impossible transition.
The API-controlled preview and transaction-time fingerprint verification ensure
the confirmed access consequence is still current without duplicating access
logic in the browser.

## D12 — Physical-location administration reflects a flexible hierarchy without access previews

**Decision.** Physical-location administration uses a path-ordered responsive
directory, a separate creation route, and unit-specific lifecycle actions on
the location detail route. Full paths remain visible in directory, selection,
and detail contexts so arbitrary hierarchy depth stays understandable without
introducing browser-owned expandable-tree state.

Creation may establish a top-level location or place it beneath any active
location. Reparenting may promote a nested location to top level or select an
eligible active parent. The interface excludes the current location, its
current parent, and its descendants from parent choices, while the API remains
authoritative for concurrent hierarchy validation. Active locations expose
rename, move, and archive; archived locations expose restore. Structural
history presents every effective-dated name, parent, lifecycle state, reason,
actor, and interval returned by the API.

Location writes use named SuperForm actions and submit directly from responsive
dialogs. They do not request organizational access-impact previews or submit
fingerprints because physical locations are not V1 authorization scopes.
Successful mutations redirect back to the refreshed detail route; validation,
duplicate, and domain failures preserve the open dialog and its entered values.
The non-sensitive creation form opts into browser snapshots, while detail-page
lifecycle reasons do not.

**Why.** Physical precision varies from campuses to shelves and therefore needs
more depth than the institutional organization presentation. Full paths make
that depth clear using the API's existing response contract. API-side checks
still protect hierarchy and lifecycle invariants.

## D13 — Valibot schemas use named modular imports

**Decision.** Web schema modules use named imports for the Valibot functions and
types they need.

**Why.** Valibot supports tree shaking for both named and namespace imports, but
named imports make each module's validation dependencies explicit and keep the
functional schema syntax concise. The import form therefore communicates the
intended modular boundary directly in source code.

## D14 — Field pipelines surface one validation message at a time

**Decision.** A user-facing field pipeline with multiple validation actions is
wrapped in Valibot's `config` with `abortPipeEarly: true`. The setting remains
local to that field pipeline; form-object and cross-field pipelines continue to
collect their independently relevant issues.

**Why.** Showing every failed constraint for one value at once obscures the
next useful correction. Stopping after the first field-level issue presents the
required-value message first, then reveals format or length feedback only after
the earlier constraint passes, while still allowing separate invalid fields to
report their own messages together.

## D15 — Server API access is grouped by API resource

**Decision.** SvelteKit loads, actions, handlers, and hooks call server-only API
functions grouped under `src/lib/server/api` by the corresponding API resource
or route group. Those functions accept the current `RequestEvent`, select the
typed Tuyau endpoint, and return its safe response tuple. Route modules retain
form validation, payload transformations, presentation messages, redirects,
and HTTP error decisions.

The request-scoped client remains available only at this server API boundary.
Concurrent route reads continue to compose the resource functions with
`Promise.all`; the functions do not introduce shared clients or serialize
independent requests.

**Why.** Resource modules keep endpoint paths and Tuyau call syntax out of page
server files without hiding route-specific behavior. This preserves the BFF's
request isolation and typed transport while making loads and actions read in
terms of application operations rather than client traversal details.

## D16 — Role administration presents immutable permission versions explicitly

**Decision.** Reusable-role administration uses a responsive directory, a
separate creation route, and role-specific administration on the detail route.
The permission registry is grouped by the stable domain prefix of each key and
shows its shared friendly label with the API-owned human description as
supporting text. Technical permission keys remain internal values and are not
rendered for users. Only permissions marked `customRoleAssignable` are offered
in configurable-role forms; restricted permissions remain visible when
reviewing protected system roles.

System-managed roles are visible but read-only. Active configurable roles may
be renamed, assigned a new permission version, or archived, while archived
configurable roles may be restored. Permission replacement is presented as
creating a new immutable version for future assignments. Existing assignments
remain linked to the exact older version they received, and detail views show
older-version assignment usage prominently rather than implying that the role
was updated in place. Role permission changes therefore submit directly without
an organizational access-impact preview or fingerprint.

Role creation opts into a non-sensitive SuperForm browser snapshot. Detail-page
rename, permission-version, archive, and restore forms do not retain their audit
reasons in browser snapshots. Successful mutations redirect to refreshed role
state; validation and API domain failures preserve the open responsive dialog
and submitted values.

**Why.** A permission key is stable software vocabulary, while its API
description and domain grouping make selection understandable without creating
a second browser-owned permission registry. Showing version-specific assignment
usage makes the API's non-retroactive authority model visible to administrators.
Direct submission is appropriate because version creation does not alter any
existing assignment's effective permissions; later assignment replacement is
the explicit workflow for moving an account to a newer version.

## D17 — Web files and route directories use kebab-case

**Decision.** Application-owned files and directories under `apps/web` use
kebab-case when their names contain multiple words. SvelteKit's reserved route
filenames, including `+page.svelte`, `+page.server.ts`, `+layout.svelte`, and
`+server.ts`, retain their framework-defined spelling. Conventional tool-owned
names such as `README.md` and `Dockerfile` also remain unchanged. Route-directory
names use kebab-case so their URL segments follow the same convention. Generated
shadcn-svelte files already conform and remain unchanged.

This convention applies to Svelte components, TypeScript modules, server API
resource modules, schemas, types, hooks, and other web-owned source files. It
does not change the API application's established filename convention.

**Why.** SvelteKit does not prescribe snake-case for ordinary TypeScript or
Svelte modules, while this application's shadcn-svelte component system already
uses kebab-case consistently. One web-wide convention avoids an artificial
distinction between generated components and application components and keeps
filenames aligned with route URLs.

## D18 — Helpers are separated by browser safety

**Decision.** General helpers that are safe for browser and server consumers
live under `src/lib/helpers`. Helpers that depend on server-only data or are
used only by server loads and actions live under `src/lib/server/helpers`.
Feature modules import from the applicable boundary rather than placing helper
functions at the root of `$lib`, inside schema modules, or inside an unrelated
API resource module.

`$lib/utils.ts` is the deliberate exception. It remains the stable utility
module configured for shadcn-svelte and contains only external-library and
generated-component support such as Tailwind class merging and component prop
utility types. Application, domain, request, response, and server helpers must
not be added there. Keeping this path stable avoids mechanically rewriting the
generated component scaffold or changing future shadcn-svelte installation
behavior.

**Why.** The directory boundary makes it apparent whether a helper may enter a
browser bundle and prevents server response handling from leaking into shared
UI utilities. Preserving shadcn-svelte's configured utility path keeps the
external component system maintainable while still giving application helpers
one predictable client-safe location and one predictable server-only location.

## D19 — Role assignments expose immutable grants and explicit lifecycle changes

**Decision.** Root role-assignment administration uses a responsive directory,
a separate account-first creation route, and an assignment detail route. A new
grant selects an account, reusable role, organizational scope and reach, and an
effective interval. The API remains responsible for selecting the reusable
role's latest immutable version. Assignment detail presents that exact version,
its friendly permission labels, current or historical effectiveness, and the
grant and termination audit records.

Replacement is restricted to the same account and reusable role. The root user
may change scope, reach, and effective interval, while the API selects the
role's latest version for the replacement grant. Moving authority to another
person or responsibility remains an explicit end-and-create workflow. Active
assignments may be ended, upcoming assignments may be cancelled, and both the
original grant and its replacement link remain visible as immutable history.

All entered schedule values are institutional Africa/Nairobi time. Forms label
date-time controls as EAT and the BFF converts browser `datetime-local` values
to timestamps carrying an explicit `+03:00` offset. Each timestamp uses the
shadcn-svelte date-and-time composition: a Popover containing a single-date
Calendar beside a separate time input. The combined local date-time remains the
canonical SuperForm value, so administrators choose exact times without a
range-only abstraction. Audit-reason forms do not use browser-history snapshots.
Successful mutations redirect to API-refreshed state, while validation and API
failures preserve the submitted SuperForm and open lifecycle dialog.

**Why.** Treating every grant and termination as a visible immutable record
matches the API authority model and prevents replacement from becoming a hidden
identity or responsibility transfer. A fixed institutional time boundary makes
scheduling deterministic across browser time zones, while explicit EAT labels
let administrators understand the values they are approving. Keeping sensitive
reasons out of browser snapshots reduces unintended retention without losing
failure-state recovery during the current request.

## D20 — Delegation is a participant workflow with separately presented root oversight

**Decision.** Delegation routes live in the authenticated workspace rather than
the root-only access-administration group. The directory is therefore visible
to every account, while the API remains responsible for limiting ordinary
accounts to proposals in which they participate and allowing effective root
oversight. Friendly relationship filters map “Proposed by me” and “Received by
me” to the authenticated account and the API's direction query; a root account
sees all visible records when neither relationship is selected.

Proposal creation begins with the paginated, searchable recipients returned by
the narrow proposal-options resource. Selecting a recipient reloads that same
resource and offers only its compatible direct assignments. The browser never
calculates compatibility. Assignment selection is whole-record selection and
shows Role, Applies within, Coverage, friendly permissions, direct-assignment
dates, and a warning that every displayed permission and area is temporarily
provided. Proposal dates use the shared single-date Calendar and separate time
input, label institutional EAT explicitly, and are converted to `+03:00` by the
BFF. Expiry is mandatory for delegation even though it remains optional for a
direct assignment.

Detail views derive which controls to display from the authenticated account,
the returned participants, and the returned lifecycle, but every mutation is
still authorized and revalidated by the API. Recipient response, proposer
revocation, and recipient relinquishment are grouped as participant actions.
Effective-root administrative termination is shown in a separate section even
when that root account is also a participant, because it records a different
audit meaning. Proposal, rejection, revocation, relinquishment, and
administrative-termination reasons are not retained in browser-history
snapshots. Successful actions redirect to refreshed detail; validation and API
failures keep the applicable SuperForm and dialog open.

**Why.** Delegation transfers temporary authority between named participants,
so placing it behind root-only navigation would prevent the recipient from
knowingly responding and the proposer from managing their own coverage.
Keeping eligibility and lifecycle enforcement at the API boundary prevents
presentation state from becoming an authorization decision. Separating root
intervention from participant choices makes the resulting audit history
understandable without exposing implementation terminology to users.

## D21 — Error boundaries share a safe state while retaining their owning frame

**Decision.** The root route owns a branded `+error.svelte` boundary for
unmatched URLs and failures outside the authenticated application group. The
`(app)` route group retains its nearer boundary so application failures remain
inside the navigation shell. Both boundaries render one shared error-state
component with status-aware 404 and 403 guidance, a generic fallback for every
other status, and a direct route home.

Error states do not render raw server exception messages. The root boundary
uses the same product mark, color tokens, card primitives, and color-mode
control as the authentication frame, while the nested boundary lets the app
shell continue to provide those surrounding concerns.

**Why.** SvelteKit selects the nearest error boundary, so a root boundary is
required to replace the framework fallback for nonexistent routes while a
nested boundary preserves useful authenticated navigation. Sharing the state
keeps language and visual treatment consistent, and suppressing exception
details avoids exposing implementation information in a user-facing failure.

## D22 — Color mode is a direct toggle with a system-derived default

**Decision.** The shared color-mode control is one icon button that immediately
toggles between light and dark modes. Its visible sun or moon follows the
resolved mode. When no explicit preference has been stored, `mode-watcher`
continues to resolve the initial mode from the operating system; using the
toggle records the user's explicit light or dark choice.

The control does not expose a dropdown or a separate system-reset action. It is
shared by the application header, authentication frame, and root error frame.
Its self-contained tooltip describes the next action from the resolved mode,
and the button uses that same dynamic text as its accessible name.

**Why.** Theme switching is a frequent binary action, so completing it with one
click reduces interaction cost without discarding a system-aware first visit.
One shared control also keeps the behavior and accessible label consistent in
every application frame. Describing the resulting action instead of only the
current state makes the compact icon understandable on hover, keyboard focus,
and assistive technology without making the tooltip essential to activation.

## D23 — Source formatting uses semantic code blocks

**Decision.** Web source is formatted as compact blocks of statements that
serve one intention, with one blank line between blocks that serve different
intentions. Imports remain one uninterrupted block. Related declarations,
repeated state, and the internals of one UI element stay together, while props,
derived concerns, major sibling UI sections, and separate workflow stages are
visually separated.

SvelteKit server actions group form parsing with its validity guard, then
separate that validation block from the API workflow and the final successful
return or redirect. An API request and its immediate error handling remain
together. Generated shadcn-svelte primitives retain their upstream formatting.

**Why.** Semantic spacing lets a reader identify the purpose and progression of
small code blocks without adding comments or creating noisy gaps between lines
that must be understood together. Retaining upstream formatting in generated
primitives avoids churn that would be overwritten by future component updates.

## D24 — Page-server boundaries enforce their own session guard

**Decision.** Every authenticated page-server load and form action invokes its
applicable session guard before validation, query processing, or API access.
Ordinary authenticated routes use `requireAuth(event)`, effective-root-only
routes use `requireRoot(event)`, and guest-only authentication routes use
`requireGuest(event)`. `requireRoot(event)` includes the authentication check.

Layout guards protect and populate their shared shells. Each child page-server
boundary also applies its own guard. An existing action helper may own the guard
when every action necessarily passes through that helper; otherwise actions
invoke the guard directly.

**Why.** SvelteKit form actions run before page and layout loads are rerun, and
parent and child loads are separate execution boundaries. Enforcing the invariant
at each page load and action prevents direct requests from reaching validation
or protected API workflows before the web application has rejected an absent,
invalid, or insufficient session.

## D25 — Authentication forms narrow and present safe API errors

**Decision.** Guest authentication actions retain Tuyau's `.safe()` tuple and
use `error.isStatus(...)` before reading a typed API error response. Login
presents the API's `401` message. Login and forgot-password distinguish rate
limiting with controlled local copy and use generic fallbacks for transport or
unexpected failures. Password setup and reset present the API's shared
account-unavailable message for `409` while retaining their existing
invalid-or-expired fallback for every other failure.

The account administration page offers credential recovery only while the
account is `ACTIVE` or `INVITED`. The API remains authoritative when a stale
page or direct action request races with a lifecycle change. Anonymous recovery
keeps its neutral response and therefore does not disclose whether an entered
email belongs to an unknown, suspended, or deactivated account.

**Why.** Tuyau status narrowing preserves the controller-derived response type
and safely excludes network failures, whose error has no response payload.
Restricting rendered API messages to the explicit status contract prevents
unexpected server details from reaching authentication pages. Matching action
visibility to account status avoids inviting an operation that the domain
correctly rejects without treating the interface as an authorization boundary.

## D26 — Shared controls and records use semantic visual cues

**Decision.** Editable date-time controls retain the shared input background
token instead of overriding it with the page background, so their affordance is
visible in both color modes. Enabled controls and actions that respond to a
click use a pointer cursor and a hover state appropriate to their design-system
variant; disabled controls retain their disabled cursor and interaction
semantics. Role directories distinguish configurable roles with an outlined
badge and system-managed roles with a subdued secondary badge; the record
itself remains fully readable and navigable.

Delegation relationship summaries use one shared participant-flow component.
It aligns each participant's name and official email around a chevron icon,
constrains both sides with CSS ellipsis, and includes a textual separator for
assistive technology. The same component is used in directory, detail, and
account contexts. The inset application header uses the same top corner radius
as its containing shell.

**Why.** Theme-aware tokens preserve editability cues without introducing
mode-specific colors. Muting only the system-managed badge communicates that
its configuration is unavailable without implying that the record is disabled.
A consistent directional layout reduces the effort required to compare
delegation participants, while CSS truncation protects responsive layouts and
keeps the complete values in the document. Matching shell radii preserves the
intended inset silhouette without clipping the sticky header.

## D27 — Catalogue categories use direct routes and path-first hierarchy context

**Decision.** Classification resources live under direct authenticated routes
rather than a content-free classification landing page. The application sidebar
uses a Catalogue group and adds each resource only when its route exists.
Catalogue-category pages use `/catalogue-categories`, `/catalogue-categories/new`,
and `/catalogue-categories/[id]` inside a pathless `(catalogue)` source group.

The directory is ordered by the API-provided full path and uses smartphone cards
plus a desktop table. Full paths remain visible in directories, parent choices,
review candidates, detail pages, and merge-target links; indentation is not the
sole hierarchy signal. Creation uses one snapshot-enabled SuperForm and an
API-owned advisory similar-category review. The reviewed candidates are not
snapshotted, and changing the reviewed name or parent makes the current browser
review unusable until refreshed.

Detail pages remain readable to every authenticated account. Mutation controls
use the API-resolved `canManageCatalogue` capability and named server actions,
but the API reauthorizes every request. Eligible reparent choices and known
archive/restore blockers are derived from the returned small hierarchy and
shown only to catalogue managers because they explain unavailable
administrative actions. The API remains authoritative under concurrent change.
Audit-reason dialogs are not browser-history snapshots. Successful writes
redirect to API-refreshed detail, while validation and domain failures retain
the applicable SuperForm and open dialog.

Merged sources render as terminal historical records with direct and canonical
target links and no mutation controls. Merge preview and execution remain Slice
6 work.

**Why.** Direct routes match the established resource administration pattern
without adding an extra navigation step. Path-first presentation makes the
three-level hierarchy and same-named categories understandable on narrow
screens. Server-owned capability and advisory-review data prevent the browser
from reconstructing authorization or similarity rules, while local hierarchy
filtering improves guidance without weakening transactional domain checks.

## D28 — Base-unit screens explain quantity semantics before administration

**Decision.** Base-unit pages use `/base-units`, `/base-units/new`, and
`/base-units/[id]` alongside categories in the pathless `(catalogue)` source
group and authenticated Catalogue navigation. The responsive directory exposes
API-supported search, countable/measured kind, and active/archive visibility
through URL-addressable GET filters.

Creation and pre-use editing present quantity kind before precision. Countable
means whole quantities and fixes precision at zero. Measured means fractional
quantities and offers one, two, or three decimal places, with the API's default
of three selected when switching into measured entry. The BFF converts the
form's controlled precision string to the API's numeric contract; shared
Valibot validation rejects incompatible kind/precision pairs before transport.

Once `firstUsedAt` is present, detail editing keeps name and symbol available
for correction but renders kind and precision as read-only values submitted
unchanged. The page explains that changing those semantics requires a
controlled conversion rather than ordinary editing. The API remains
authoritative if use begins concurrently after an unused detail page loads.

Base-unit detail includes effective history and manager-only edit, archive, and
restore dialogs. Creation is the only snapshot-enabled base-unit form;
administrative reasons remain request-local. Successful writes redirect to the
refreshed detail route, while validation, duplicate, semantic-lock, and restore
conflicts retain the applicable SuperForm and dialog.

**Why.** Users choose units to constrain future stock quantities, so ordinary
language about whole and fractional values is more useful than exposing a raw
precision integer. Locking the visual semantics at the same milestone as the
API prevents the interface from offering a knowingly unavailable correction,
without treating stale browser state as a domain guarantee.

## D29 — Sidebar navigation uses compact route-aware disclosures

**Decision.** The application sidebar keeps Workspace, Catalogue, and
permission-gated Access administration headings visible as disclosure
controls. At most one group is open. The group that owns the current route
opens when navigation changes the pathname, while users may manually collapse
the current group. Destination links continue to close the off-canvas sidebar
on smartphones.

The footer presents the signed-in identity as one compact avatar trigger. Its
menu contains Change password and Log out. My access remains a Workspace
destination and is not repeated in the footer; it uses an account icon so the
key icon remains associated with access assignment rather than personal
credentials. The generated initials are a text fallback, not a claimed user
profile image.

**Why.** Persistent group headings keep the application map discoverable while
disclosing one route family at a time prevents a growing navigation list from
hiding destinations below the viewport. Route-aware opening preserves context
after navigation without taking away the user's ability to compact the current
view. Consolidating infrequent session actions behind the identity trigger
reduces repetition and keeps the footer useful at narrow heights.
