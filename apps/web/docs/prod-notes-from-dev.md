# Web Production Notes from Development

Record development findings here when they affect the Node adapter, runtime
environment, reverse proxy, session-cookie forwarding, SSE, Docker images, or
production operation.

## API origins and cookie propagation

`PRIVATE_API_URL` is mandatory server-only runtime configuration. It must name
the API origin reachable from the SvelteKit server; it is never exposed to
browser code. `PUBLIC_API_URL` is reserved for the future browser-to-Transmit
SSE connection and may differ from the private container-network origin.

The SvelteKit server forwards incoming cookies to AdonisJS and reissues every
API `Set-Cookie` response to the browser. Reverse-proxy and session-cookie
domain, path, `Secure`, and `SameSite` settings must therefore be tested
together in the deployment environment. The production SvelteKit adapter is
the Node adapter.

## Node web runtime

The web build uses `@sveltejs/adapter-node` and therefore produces a standalone
Node server rather than a platform-selected adapter output. The web container
must start that generated server and provide `PRIVATE_API_URL` at runtime.
Browser-visible configuration remains separate.

The application shell accounts for mobile viewport and safe-area insets, but
the Week 1 exit check still requires manual inspection at a representative
smartphone width.

## Container runtime

Build `apps/web/Dockerfile` from the monorepo root. The resulting image starts
the adapter-node output with `node build` and listens on `PORT` (adapter-node
defaults to `3000`).

Production must provide:

- `ORIGIN`, matching the externally visible HTTPS origin;
- `PRIVATE_API_URL`, resolving from the web container to the API container;
- `PUBLIC_API_URL`, resolving from the browser to the future protected
  Transmit routes; and
- `PORT` and `HOST` when platform defaults are not suitable.

Do not point `PRIVATE_API_URL` at a host-loopback address from inside a
container. Use the deployment platform's internal API service address.

Image build and runtime smoke checks were deliberately deferred from Week 1 to
the deployment stage. Treat the Dockerfile as an unverified packaging
definition until those checks pass.
