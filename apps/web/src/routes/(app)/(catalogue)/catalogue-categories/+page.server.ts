import { getCatalogueCategories } from '$lib/server/api/catalogue-categories';
import { requireAuth } from '$lib/server/auth/guards';
import { booleanFilter, optionalFilter } from '$lib/server/helpers/list-filters';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireAuth(event);

	const query = {
		search: optionalFilter(event.url.searchParams.get('search')),
		includeArchived: booleanFilter(event.url.searchParams.get('includeArchived'))
	};

	const [response, apiError] = await getCatalogueCategories(event, query);
	if (apiError)
		error(apiError.status ?? 502, 'The catalogue-category directory could not be loaded.');

	return {
		directory: response,
		filters: query
	};
};
