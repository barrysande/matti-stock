import { getBaseUnitDirectory } from '$lib/server/api/base-units';
import { requireAuth } from '$lib/server/auth/guards';
import { baseUnitKindFilter } from '$lib/server/helpers/base-unit-route';
import { booleanFilter, optionalFilter, positivePage } from '$lib/server/helpers/list-filters';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireAuth(event);

	const query = {
		page: positivePage(event.url.searchParams.get('page')),
		search: optionalFilter(event.url.searchParams.get('search')),
		includeArchived: booleanFilter(event.url.searchParams.get('includeArchived')),
		kind: baseUnitKindFilter(event.url.searchParams.get('kind'))
	};

	const [response, apiError] = await getBaseUnitDirectory(event, query);
	if (apiError) {
		error(apiError.status ?? 502, 'The base-unit directory could not be loaded.');
	}

	return { directory: response, filters: query };
};
