import type { RequestEvent } from '@sveltejs/kit';

type RoleDirectoryQuery = {
	search?: string;
	includeArchived?: boolean;
	systemManaged?: boolean;
};

type CreateRoleBody = {
	name: string;
	permissionKeys: string[];
	reason: string;
};

type RenameRoleBody = {
	name: string;
	reason: string;
};

type ReplaceRolePermissionsBody = {
	permissionKeys: string[];
	reason: string;
};

export function getRoles(event: RequestEvent, query: RoleDirectoryQuery) {
	return event.locals.client.api.roles.index({ query }).safe();
}

export function getRole(event: RequestEvent, id: string) {
	return event.locals.client.api.roles.show({ params: { id } }).safe();
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
