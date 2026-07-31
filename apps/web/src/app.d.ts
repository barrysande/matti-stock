// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { ApiClient } from '$lib/server/api/client';
import type { Data } from 'api/data';

type CurrentAccount = Data.CurrentAccount;

declare global {
	namespace App {
		interface Error {
			message: string;
		}
		interface Locals {
			/** Request-scoped, server-only Tuyau client. */
			client: ApiClient;
			/** Authenticated account resolved once for this SvelteKit request. */
			account: CurrentAccount | null;
		}
		interface PageData {
			account?: CurrentAccount | null;
			flash?: {
				type: 'success' | 'error' | 'info' | 'warning';
				message: string;
			};
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
