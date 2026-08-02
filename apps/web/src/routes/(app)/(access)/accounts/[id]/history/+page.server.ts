import { optionalFilter, positivePage } from '$lib/server/helpers/list-filters';
import { getAccount, getAccountAccessEvents } from '$lib/server/api/accounts';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const query = {
		page: positivePage(event.url.searchParams.get('page')),
		category: optionalFilter(event.url.searchParams.get('category')) as
			'ACCOUNT' | 'AUTHENTICATION' | 'CREDENTIAL' | 'ROLE_ASSIGNMENT' | 'DELEGATION' | undefined,
		eventType: optionalFilter(event.url.searchParams.get('eventType'))
	};

	const [[accountResponse, accountError], [eventsResponse, eventsError]] = await Promise.all([
		getAccount(event, event.params.id),
		getAccountAccessEvents(event, event.params.id, query)
	]);
	if (accountError) error(accountError.status ?? 404, 'The account could not be found.');
	if (eventsError) error(eventsError.status ?? 502, 'The access timeline could not be loaded.');

	return {
		account: accountResponse.data,
		timeline: eventsResponse,
		filters: query
	};
};
