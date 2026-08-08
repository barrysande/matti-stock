import type { RequestEvent } from '@sveltejs/kit';
import type {
	CatalogueCategoryDirectoryQuery,
	CreateCatalogueCategoryBody,
	MergeCatalogueCategoryBody,
	ReparentCatalogueCategoryBody,
	ReviewCatalogueCategoryCreationBody,
	UpdateCatalogueCategoryDetailsBody
} from '$lib/types/catalogue-categories';

export function getCatalogueCategories(
	event: RequestEvent,
	query: CatalogueCategoryDirectoryQuery
) {
	return event.locals.client.api.catalogueCategories.index({ query }).safe();
}

export function getCatalogueCategory(event: RequestEvent, id: string) {
	return event.locals.client.api.catalogueCategories.show({ params: { id } }).safe();
}

export function getCatalogueCategoryHistory(event: RequestEvent, id: string, page?: number) {
	return event.locals.client.api.catalogueCategories
		.history({ params: { id }, query: { page } })
		.safe();
}

export function reviewCatalogueCategoryCreation(
	event: RequestEvent,
	body: ReviewCatalogueCategoryCreationBody
) {
	return event.locals.client.api.catalogueCategories.creationReview({ body }).safe();
}

export function createCatalogueCategory(event: RequestEvent, body: CreateCatalogueCategoryBody) {
	return event.locals.client.api.catalogueCategories.store({ body }).safe();
}

export function updateCatalogueCategoryDetails(
	event: RequestEvent,
	id: string,
	body: UpdateCatalogueCategoryDetailsBody
) {
	return event.locals.client.api.catalogueCategories.updateDetails({ params: { id }, body }).safe();
}

export function reparentCatalogueCategory(
	event: RequestEvent,
	id: string,
	body: ReparentCatalogueCategoryBody
) {
	return event.locals.client.api.catalogueCategories.reparent({ params: { id }, body }).safe();
}

export function archiveCatalogueCategory(event: RequestEvent, id: string, reason: string) {
	return event.locals.client.api.catalogueCategories
		.archive({ params: { id }, body: { reason } })
		.safe();
}

export function restoreCatalogueCategory(event: RequestEvent, id: string, reason: string) {
	return event.locals.client.api.catalogueCategories
		.restore({ params: { id }, body: { reason } })
		.safe();
}

export function previewCatalogueCategoryMerge(
	event: RequestEvent,
	id: string,
	targetCategoryId: string
) {
	return event.locals.client.api.catalogueCategories
		.previewMerge({ params: { id }, body: { targetCategoryId } })
		.safe();
}

export function mergeCatalogueCategory(
	event: RequestEvent,
	id: string,
	body: MergeCatalogueCategoryBody
) {
	return event.locals.client.api.catalogueCategories.merge({ params: { id }, body }).safe();
}
