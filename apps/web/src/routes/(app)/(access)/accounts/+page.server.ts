import { optionalFilter, positivePage } from '$lib/server/helpers/list-filters';
import { getAccounts } from '$lib/server/api/accounts';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const query = {
		page: positivePage(event.url.searchParams.get('page')),
		search: optionalFilter(event.url.searchParams.get('search')),
		status: optionalFilter(event.url.searchParams.get('status')) as
			'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED' | undefined,
		setupStatus: optionalFilter(event.url.searchParams.get('setupStatus')) as
			'PENDING' | 'COMPLETE' | undefined
	};

	const [response, apiError] = await getAccounts(event, query);
	if (apiError) error(apiError.status ?? 502, 'The account directory could not be loaded.');

	return {
		directory: response,
		filters: query
	};
};
