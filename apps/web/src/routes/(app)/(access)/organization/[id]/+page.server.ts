import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const [response, apiError] = await event.locals.client.api.organizationalUnits
		.show({ params: { id: event.params.id } })
		.safe();
	if (apiError) error(apiError.status ?? 404, 'The organizational unit could not be found.');

	return { unit: response.data };
};
