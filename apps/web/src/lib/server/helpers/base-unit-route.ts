import type { BaseUnitKind } from '$lib/types/base-units';
import type { RequestEvent } from '@sveltejs/kit';
import { redirect } from 'sveltekit-flash-message/server';

export function baseUnitKindFilter(value: string | null): BaseUnitKind | undefined {
	return value === 'COUNTABLE' || value === 'MEASURED' ? value : undefined;
}

export function redirectToBaseUnit(event: RequestEvent, message: string) {
	redirect(303, `/base-units/${event.params.id}`, { type: 'success', message }, event.cookies);
}
