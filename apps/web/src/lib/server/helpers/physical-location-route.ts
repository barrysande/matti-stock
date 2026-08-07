import type { RequestEvent } from '@sveltejs/kit';
import { redirect } from 'sveltekit-flash-message/server';

export function redirectToPhysicalLocation(event: RequestEvent, message: string) {
	redirect(303, `/locations/${event.params.id}`, { type: 'success', message }, event.cookies);
}
