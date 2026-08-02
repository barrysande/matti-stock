import type { RequestEvent } from '@sveltejs/kit';

type PhysicalLocationDirectoryQuery = {
	search?: string;
	includeArchived?: boolean;
};

type CreatePhysicalLocationBody = {
	name: string;
	parentId?: string;
	reason: string;
};

type RenamePhysicalLocationBody = {
	name: string;
	reason: string;
};

type ReparentPhysicalLocationBody = {
	parentId: string | null;
	reason: string;
};

export function getPhysicalLocations(event: RequestEvent, query: PhysicalLocationDirectoryQuery) {
	return event.locals.client.api.physicalLocations.index({ query }).safe();
}

export function getPhysicalLocation(event: RequestEvent, id: string) {
	return event.locals.client.api.physicalLocations.show({ params: { id } }).safe();
}

export function createPhysicalLocation(event: RequestEvent, body: CreatePhysicalLocationBody) {
	return event.locals.client.api.physicalLocations.store({ body }).safe();
}

export function renamePhysicalLocation(
	event: RequestEvent,
	id: string,
	body: RenamePhysicalLocationBody
) {
	return event.locals.client.api.physicalLocations.rename({ params: { id }, body }).safe();
}

export function reparentPhysicalLocation(
	event: RequestEvent,
	id: string,
	body: ReparentPhysicalLocationBody
) {
	return event.locals.client.api.physicalLocations.reparent({ params: { id }, body }).safe();
}

export function archivePhysicalLocation(event: RequestEvent, id: string, reason: string) {
	return event.locals.client.api.physicalLocations
		.archive({ params: { id }, body: { reason } })
		.safe();
}

export function restorePhysicalLocation(event: RequestEvent, id: string, reason: string) {
	return event.locals.client.api.physicalLocations
		.restore({ params: { id }, body: { reason } })
		.safe();
}
