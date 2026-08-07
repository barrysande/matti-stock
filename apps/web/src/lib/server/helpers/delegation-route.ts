import { delegationErrorMessage } from '$lib/helpers/delegation-presentation';
import { apiErrorDetails } from '$lib/server/helpers/api-error';
import type { DelegationRelationship, DelegationStatus } from '$lib/types/delegation';
import { fail, type RequestEvent } from '@sveltejs/kit';
import { redirect, setFlash } from 'sveltekit-flash-message/server';

export function delegationStatus(value: string | null, statuses: readonly DelegationStatus[]) {
	return statuses.find((status) => status === value);
}

export function delegationRelationship(value: string | null): DelegationRelationship | undefined {
	if (value === 'PROPOSED_BY_ME' || value === 'RECEIVED_BY_ME') return value;
}

export function redirectToDelegation(event: RequestEvent, message: string) {
	redirect(303, `/delegations/${event.params.id}`, { type: 'success', message }, event.cookies);
}

export function delegationMutationFailure<T>(
	event: RequestEvent,
	apiError: { status?: number; response?: unknown },
	form: T,
	fallback: string
) {
	const details = apiErrorDetails(apiError, fallback);
	setFlash(
		{ type: 'error', message: delegationErrorMessage(details.message, fallback) },
		event.cookies
	);
	return fail(apiError.status ?? 400, { form });
}
