import { createApiClient } from '$lib/server/api/client';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.client = createApiClient(event);

	return resolve(event);
};
