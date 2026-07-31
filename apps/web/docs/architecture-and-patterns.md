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

**Why.** A completed smartphone navigation should reveal the destination
instead of leaving the off-canvas navigation over it. Using the sidebar's own
context API keeps sheet state ownership inside the scaffolded component.

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
