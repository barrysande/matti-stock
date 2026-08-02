import { getLiveness } from '$lib/server/api/health';
import { requireAuth } from '$lib/server/auth/guards';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireAuth(event);

	const [, error] = await getLiveness(event);

	return {
		apiAvailable: !error
	};
};
