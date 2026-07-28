import { requireAuth } from '$lib/server/auth/guards';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = (event) => {
	return {
		account: requireAuth(event)
	};
};
