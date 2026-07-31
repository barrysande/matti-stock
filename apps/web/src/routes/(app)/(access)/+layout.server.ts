import { requireRoot } from '$lib/server/auth/guards';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = (event) => {
	return { account: requireRoot(event) };
};
