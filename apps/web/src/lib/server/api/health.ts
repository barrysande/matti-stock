import type { RequestEvent } from '@sveltejs/kit';

export function getLiveness(event: RequestEvent) {
	return event.locals.client.api.healthChecks.live({}).safe();
}
