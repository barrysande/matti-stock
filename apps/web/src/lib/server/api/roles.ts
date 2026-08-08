import type { RequestEvent } from '@sveltejs/kit';
import type {
	RoleDirectoryQuery,
	RoleOptionsQuery,
	CreateRoleBody,
	RenameRoleBody,
	ReplaceRolePermissionsBody
} from '$lib/types/roles';

export function getRoleDirectory(event: RequestEvent, query: RoleDirectoryQuery) {
	return event.locals.client.api.roles.index({ query }).safe();
}

export function getRoles(event: RequestEvent, query: RoleOptionsQuery) {
	return event.locals.client.api.roles.options({ query }).safe();
}

export function getRole(event: RequestEvent, id: string) {
	return event.locals.client.api.roles.show({ params: { id } }).safe();
}

export function getRoleHistory(event: RequestEvent, id: string, page?: number) {
	return event.locals.client.api.roles.history({ params: { id }, query: { page } }).safe();
}

export function createRole(event: RequestEvent, body: CreateRoleBody) {
	return event.locals.client.api.roles.store({ body }).safe();
}

export function renameRole(event: RequestEvent, id: string, body: RenameRoleBody) {
	return event.locals.client.api.roles.rename({ params: { id }, body }).safe();
}

export function replaceRolePermissions(
	event: RequestEvent,
	id: string,
	body: ReplaceRolePermissionsBody
) {
	return event.locals.client.api.roles.replacePermissions({ params: { id }, body }).safe();
}

export function archiveRole(event: RequestEvent, id: string, reason: string) {
	return event.locals.client.api.roles.archive({ params: { id }, body: { reason } }).safe();
}

export function restoreRole(event: RequestEvent, id: string, reason: string) {
	return event.locals.client.api.roles.restore({ params: { id }, body: { reason } }).safe();
}
