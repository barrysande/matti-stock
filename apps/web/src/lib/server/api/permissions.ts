import type { RequestEvent } from '@sveltejs/kit';

export function getPermissions(event: RequestEvent) {
	return event.locals.client.api.permissions.index({}).safe();
}
