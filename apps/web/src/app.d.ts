// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { ApiClient } from '$lib/server/api/client';
import type { Data } from 'api/data';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			/** Request-scoped, server-only Tuyau client. */
			client: ApiClient;
			/** Authenticated account resolved once for this SvelteKit request. */
			account: Data.CurrentAccount | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
