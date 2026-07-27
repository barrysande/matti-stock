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
