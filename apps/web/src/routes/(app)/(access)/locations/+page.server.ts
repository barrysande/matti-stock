import { booleanFilter, optionalFilter } from '$lib/server/helpers/list-filters';
import { getPhysicalLocations } from '$lib/server/api/physical-locations';
import { requireRoot } from '$lib/server/auth/guards';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireRoot(event);

	const query = {
		search: optionalFilter(event.url.searchParams.get('search')),
		includeArchived: booleanFilter(event.url.searchParams.get('includeArchived'))
	};

	const [response, apiError] = await getPhysicalLocations(event, query);
	if (apiError)
		error(apiError.status ?? 502, 'The physical-location directory could not be loaded.');

	return {
		directory: response,
		filters: query
	};
};
