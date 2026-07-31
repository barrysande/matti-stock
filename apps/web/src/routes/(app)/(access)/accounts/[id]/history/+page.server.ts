import { optionalFilter, positivePage } from '$lib/schemas/list-filters';
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
		event.locals.client.api.accounts.show({ params: { id: event.params.id } }).safe(),
		event.locals.client.api.accountAccessEvents
			.index({ params: { id: event.params.id }, query })
			.safe()
	]);

	if (accountError) error(accountError.status ?? 404, 'The account could not be found.');
	if (eventsError) error(eventsError.status ?? 502, 'The access timeline could not be loaded.');

	return {
		account: accountResponse.data,
		timeline: eventsResponse,
		filters: query
	};
};
