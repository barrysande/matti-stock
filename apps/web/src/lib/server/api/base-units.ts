import type { RequestEvent } from '@sveltejs/kit';
import type { BaseUnitDetailsBody, BaseUnitDirectoryQuery } from '$lib/types/base-units';

export function getBaseUnits(event: RequestEvent, query: BaseUnitDirectoryQuery) {
	return event.locals.client.api.baseUnits.index({ query }).safe();
}

export function getBaseUnit(event: RequestEvent, id: string) {
	return event.locals.client.api.baseUnits.show({ params: { id } }).safe();
}

export function createBaseUnit(event: RequestEvent, body: BaseUnitDetailsBody) {
	return event.locals.client.api.baseUnits.store({ body }).safe();
}

export function updateBaseUnitDetails(event: RequestEvent, id: string, body: BaseUnitDetailsBody) {
	return event.locals.client.api.baseUnits.updateDetails({ params: { id }, body }).safe();
}

export function archiveBaseUnit(event: RequestEvent, id: string, reason: string) {
	return event.locals.client.api.baseUnits.archive({ params: { id }, body: { reason } }).safe();
}

export function restoreBaseUnit(event: RequestEvent, id: string, reason: string) {
	return event.locals.client.api.baseUnits.restore({ params: { id }, body: { reason } }).safe();
}
