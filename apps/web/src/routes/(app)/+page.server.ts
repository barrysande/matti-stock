import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [, error] = await locals.client.api.healthChecks.live({}).safe();

	return {
		apiAvailable: !error
	};
};
