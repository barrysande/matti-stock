import { getCatalogueCategories } from '$lib/server/api/catalogue-categories';
import { getCatalogueItems } from '$lib/server/api/catalogue-items';
import { requireAuth } from '$lib/server/auth/guards';
import { booleanFilter, optionalFilter, positivePage } from '$lib/server/helpers/list-filters';
import type {
	CatalogueItemIdentificationStatus,
	CatalogueItemStockType,
	CatalogueItemTrackingMethod
} from '$lib/types/catalogue-items';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireAuth(event);

	const query = {
		page: positivePage(event.url.searchParams.get('page')),
		search: optionalFilter(event.url.searchParams.get('search')),
		categoryId: optionalFilter(event.url.searchParams.get('categoryId')),
		stockType: optionalFilter(event.url.searchParams.get('stockType')) as
			CatalogueItemStockType | undefined,
		trackingMethod: optionalFilter(event.url.searchParams.get('trackingMethod')) as
			CatalogueItemTrackingMethod | undefined,
		identificationStatus: optionalFilter(event.url.searchParams.get('identificationStatus')) as
			CatalogueItemIdentificationStatus | undefined,
		includeArchived: booleanFilter(event.url.searchParams.get('includeArchived'))
	};

	const [itemResult, categoryResult] = await Promise.all([
		getCatalogueItems(event, query),
		getCatalogueCategories(event, { includeArchived: true })
	]);
	const [itemResponse, itemError] = itemResult;
	const [categoryResponse, categoryError] = categoryResult;
	if (itemError) error(itemError.status ?? 502, 'The catalogue directory could not be loaded.');
	if (categoryError)
		error(categoryError.status ?? 502, 'Catalogue-category filters could not be loaded.');

	return {
		directory: itemResponse,
		categories: categoryResponse.data,
		filters: query
	};
};
