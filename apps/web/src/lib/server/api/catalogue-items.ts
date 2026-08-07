import type { RequestEvent } from '@sveltejs/kit';
import type {
	CatalogueItemDirectoryQuery,
	CatalogueItemLookupQuery,
	CatalogueItemReviewBody,
	CreateCatalogueItemBody,
	RestoreCatalogueItemBody,
	UpdateCatalogueItemClassificationBody,
	UpdateCatalogueItemDetailsBody
} from '$lib/types/catalogue-items';

export function getCatalogueItems(event: RequestEvent, query: CatalogueItemDirectoryQuery) {
	return event.locals.client.api.catalogueItems.index({ query }).safe();
}

export function lookupCatalogueItems(event: RequestEvent, query: CatalogueItemLookupQuery) {
	return event.locals.client.api.catalogueItems.lookup({ query }).safe();
}

export function reviewCatalogueItemCreation(event: RequestEvent, body: CatalogueItemReviewBody) {
	return event.locals.client.api.catalogueItems.creationReview({ body }).safe();
}

export function createCatalogueItem(event: RequestEvent, body: CreateCatalogueItemBody) {
	return event.locals.client.api.catalogueItems.store({ body }).safe();
}

export function getCatalogueItem(event: RequestEvent, catalogueCode: string) {
	return event.locals.client.api.catalogueItems.show({ params: { catalogueCode } }).safe();
}

export function reviewCatalogueItemChange(
	event: RequestEvent,
	catalogueCode: string,
	body: CatalogueItemReviewBody
) {
	return event.locals.client.api.catalogueItems
		.changeReview({ params: { catalogueCode }, body })
		.safe();
}

export function updateCatalogueItemDetails(
	event: RequestEvent,
	catalogueCode: string,
	body: UpdateCatalogueItemDetailsBody
) {
	return event.locals.client.api.catalogueItems
		.updateDetails({ params: { catalogueCode }, body })
		.safe();
}

export function updateCatalogueItemClassification(
	event: RequestEvent,
	catalogueCode: string,
	body: UpdateCatalogueItemClassificationBody
) {
	return event.locals.client.api.catalogueItems
		.updateClassification({ params: { catalogueCode }, body })
		.safe();
}

export function archiveCatalogueItem(event: RequestEvent, catalogueCode: string, reason: string) {
	return event.locals.client.api.catalogueItems
		.archive({ params: { catalogueCode }, body: { reason } })
		.safe();
}

export function restoreCatalogueItem(
	event: RequestEvent,
	catalogueCode: string,
	body: RestoreCatalogueItemBody
) {
	return event.locals.client.api.catalogueItems.restore({ params: { catalogueCode }, body }).safe();
}
