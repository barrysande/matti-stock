import { booleanFilter, optionalFilter } from '$lib/server/helpers/list-filters';
import { getRoles } from '$lib/server/api/roles';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

function roleTypeFilter(value: string | null) {
	return value === 'true' ? true : value === 'false' ? false : undefined;
}

export const load: PageServerLoad = async (event) => {
	const query = {
		search: optionalFilter(event.url.searchParams.get('search')),
		includeArchived: booleanFilter(event.url.searchParams.get('includeArchived')),
		systemManaged: roleTypeFilter(event.url.searchParams.get('systemManaged'))
	};

	const [response, apiError] = await getRoles(event, query);
	if (apiError) error(apiError.status ?? 502, 'The role directory could not be loaded.');

	return {
		directory: response,
		filters: query
	};
};
