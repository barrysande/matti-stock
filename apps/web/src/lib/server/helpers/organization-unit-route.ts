import type { RequestEvent } from '@sveltejs/kit';
import { redirect } from 'sveltekit-flash-message/server';

export function organizationalUnitChangeInvalidatesPreview(code: string | undefined) {
	return (
		code === 'E_STALE_ORGANIZATIONAL_ACCESS_IMPACT' ||
		code === 'E_INVALID_ORGANIZATIONAL_UNIT_CHANGE'
	);
}

export function redirectToOrganizationalUnit(event: RequestEvent, message: string) {
	redirect(303, `/organization/${event.params.id}`, { type: 'success', message }, event.cookies);
}
