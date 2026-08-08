import type { RequestEvent } from '@sveltejs/kit';
import type {
	PhysicalLocationDirectoryQuery,
	CreatePhysicalLocationBody,
	RenamePhysicalLocationBody,
	ReparentPhysicalLocationBody
} from '$lib/types/physical-locations';

export function getPhysicalLocations(event: RequestEvent, query: PhysicalLocationDirectoryQuery) {
	return event.locals.client.api.physicalLocations.index({ query }).safe();
}

export function getPhysicalLocation(event: RequestEvent, id: string) {
	return event.locals.client.api.physicalLocations.show({ params: { id } }).safe();
}

export function getPhysicalLocationHistory(event: RequestEvent, id: string, page?: number) {
	return event.locals.client.api.physicalLocations
		.history({ params: { id }, query: { page } })
		.safe();
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
