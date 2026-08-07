import type { RequestEvent } from '@sveltejs/kit';
import { redirect } from 'sveltekit-flash-message/server';

export function roleTypeFilter(value: string | null) {
	return value === 'true' ? true : value === 'false' ? false : undefined;
}

export function redirectToRole(event: RequestEvent, message: string) {
	redirect(303, `/roles/${event.params.id}`, { type: 'success', message }, event.cookies);
}
