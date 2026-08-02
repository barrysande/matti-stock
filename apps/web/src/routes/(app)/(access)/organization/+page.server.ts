import { booleanFilter, optionalFilter } from '$lib/server/helpers/list-filters';
import { getOrganizationalUnits } from '$lib/server/api/organizational-units';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const query = {
		search: optionalFilter(event.url.searchParams.get('search')),
		unitType: optionalFilter(event.url.searchParams.get('unitType')) as
			'INSTITUTE' | 'DEPARTMENT' | 'SUB_DEPARTMENT' | undefined,
		includeArchived: booleanFilter(event.url.searchParams.get('includeArchived'))
	};
	const [response, apiError] = await getOrganizationalUnits(event, query);
	if (apiError) error(apiError.status ?? 502, 'The organizational directory could not be loaded.');

	return {
		directory: response,
		filters: query
	};
};
