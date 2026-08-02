import type { RequestEvent } from '@sveltejs/kit';
import type {
	CreateRoleAssignmentBody,
	ReplaceRoleAssignmentBody,
	RoleAssignmentDirectoryQuery
} from '$lib/types/role-assignment';

export function getRoleAssignments(event: RequestEvent, query: RoleAssignmentDirectoryQuery) {
	return event.locals.client.api.roleAssignments.index({ query }).safe();
}

export function getRoleAssignment(event: RequestEvent, id: string) {
	return event.locals.client.api.roleAssignments.show({ params: { id } }).safe();
}

export function createRoleAssignment(event: RequestEvent, body: CreateRoleAssignmentBody) {
	return event.locals.client.api.roleAssignments.store({ body }).safe();
}

export function replaceRoleAssignment(
	event: RequestEvent,
	id: string,
	body: ReplaceRoleAssignmentBody
) {
	return event.locals.client.api.roleAssignments.replace({ params: { id }, body }).safe();
}

export function endRoleAssignment(event: RequestEvent, id: string, reason: string) {
	return event.locals.client.api.roleAssignments.end({ params: { id }, body: { reason } }).safe();
}

export function cancelRoleAssignment(event: RequestEvent, id: string, reason: string) {
	return event.locals.client.api.roleAssignments
		.cancel({ params: { id }, body: { reason } })
		.safe();
}
