import { booleanFilter, optionalFilter } from '$lib/server/helpers/list-filters';
import { getRoles } from '$lib/server/api/roles';
import { requireRoot } from '$lib/server/auth/guards';
import { roleTypeFilter } from '$lib/server/helpers/role-route';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireRoot(event);

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
