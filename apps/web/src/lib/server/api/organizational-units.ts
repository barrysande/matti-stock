import type { RequestEvent } from '@sveltejs/kit';

type OrganizationalUnitType = 'INSTITUTE' | 'DEPARTMENT' | 'SUB_DEPARTMENT';
type CreatableOrganizationalUnitType = 'DEPARTMENT' | 'SUB_DEPARTMENT';
type OrganizationalAccessImpactOperation = 'CREATE_CHILD' | 'REPARENT' | 'ARCHIVE' | 'RESTORE';

type OrganizationalUnitDirectoryQuery = {
	search?: string;
	unitType?: OrganizationalUnitType;
	includeArchived?: boolean;
};

type CreateOrganizationalUnitBody = {
	name: string;
	unitType: CreatableOrganizationalUnitType;
	parentId: string;
	reason: string;
	impactFingerprint: string;
};

type OrganizationalAccessImpactBody = {
	operation: OrganizationalAccessImpactOperation;
	parentId?: string;
	childUnitType?: CreatableOrganizationalUnitType;
};

type RenameOrganizationalUnitBody = {
	name: string;
	reason: string;
};

type ReparentOrganizationalUnitBody = {
	parentId: string;
	reason: string;
	impactFingerprint: string;
};

type AdministerOrganizationalUnitBody = {
	reason: string;
	impactFingerprint: string;
};

export function getOrganizationalUnits(
	event: RequestEvent,
	query: OrganizationalUnitDirectoryQuery
) {
	return event.locals.client.api.organizationalUnits.index({ query }).safe();
}

export function getOrganizationalUnit(event: RequestEvent, id: string) {
	return event.locals.client.api.organizationalUnits.show({ params: { id } }).safe();
}

export function getOrganizationalUnitHistory(event: RequestEvent, id: string, page?: number) {
	return event.locals.client.api.organizationalUnits
		.history({ params: { id }, query: { page } })
		.safe();
}

export function createOrganizationalUnit(event: RequestEvent, body: CreateOrganizationalUnitBody) {
	return event.locals.client.api.organizationalUnits.store({ body }).safe();
}

export function previewOrganizationalAccessImpact(
	event: RequestEvent,
	id: string,
	body: OrganizationalAccessImpactBody
) {
	return event.locals.client.api.organizationalUnits.accessImpact({ params: { id }, body }).safe();
}

export function renameOrganizationalUnit(
	event: RequestEvent,
	id: string,
	body: RenameOrganizationalUnitBody
) {
	return event.locals.client.api.organizationalUnits.rename({ params: { id }, body }).safe();
}

export function reparentOrganizationalUnit(
	event: RequestEvent,
	id: string,
	body: ReparentOrganizationalUnitBody
) {
	return event.locals.client.api.organizationalUnits.reparent({ params: { id }, body }).safe();
}

export function archiveOrganizationalUnit(
	event: RequestEvent,
	id: string,
	body: AdministerOrganizationalUnitBody
) {
	return event.locals.client.api.organizationalUnits.archive({ params: { id }, body }).safe();
}

export function restoreOrganizationalUnit(
	event: RequestEvent,
	id: string,
	body: AdministerOrganizationalUnitBody
) {
	return event.locals.client.api.organizationalUnits.restore({ params: { id }, body }).safe();
}
