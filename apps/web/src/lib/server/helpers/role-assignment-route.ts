import type { RequestEvent } from '@sveltejs/kit';
import { redirect } from 'sveltekit-flash-message/server';

export function roleAssignmentStatus<const Status extends string>(
	value: string | null,
	statuses: readonly Status[]
) {
	return statuses.find((status) => status === value);
}

export function redirectToRoleAssignment(event: RequestEvent, message: string) {
	redirect(
		303,
		`/role-assignments/${event.params.id}`,
		{ type: 'success', message },
		event.cookies
	);
}
