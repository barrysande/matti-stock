import { getCatalogueItem, reviewCatalogueItemChange } from '$lib/server/api/catalogue-items';
import { apiErrorDetails } from '$lib/server/helpers/api-error';
import type { CatalogueItemReviewBody } from '$lib/types/catalogue-items';
import { error, type RequestEvent } from '@sveltejs/kit';
import { redirect, setFlash } from 'sveltekit-flash-message/server';

export function redirectToCatalogueItem(
	event: RequestEvent,
	catalogueCode: string,
	message: string
) {
	redirect(303, `/catalogue-items/${catalogueCode}`, { type: 'success', message }, event.cookies);
}

export async function getCurrentCatalogueItem(event: RequestEvent, catalogueCode: string) {
	const [response, apiError] = await getCatalogueItem(event, catalogueCode);
	if (apiError) error(apiError.status ?? 404, 'The catalogue item could not be found.');
	return response.data;
}

export async function reviewCurrentCatalogueItemChange(
	event: RequestEvent,
	catalogueCode: string,
	proposal: CatalogueItemReviewBody
) {
	const [response, apiError] = await reviewCatalogueItemChange(event, catalogueCode, proposal);
	if (apiError) {
		const details = apiErrorDetails(apiError, 'Similar catalogue items could not be reviewed.');
		setFlash({ type: 'error', message: details.message }, event.cookies);
		return { apiError, response: null };
	}

	return { apiError: null, response };
}
