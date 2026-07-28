import { createApiClient } from '$lib/server/api/client';
import { getCurrentAccount } from '$lib/server/api/session';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.client = createApiClient(event);
	event.locals.account = await getCurrentAccount(event);

	return resolve(event);
};
