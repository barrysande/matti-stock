import { createLocationSchema } from '$lib/schemas/location';
import { createPhysicalLocation, getPhysicalLocations } from '$lib/server/api/physical-locations';
import { apiErrorDetails } from '$lib/utils';
import { error, fail } from '@sveltejs/kit';
import { redirect, setFlash } from 'sveltekit-flash-message/server';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';

const formId = 'physical-location-create';

export const load: PageServerLoad = async (event) => {
	const [response, apiError] = await getPhysicalLocations(event, {});
	if (apiError)
		error(apiError.status ?? 502, 'The physical-location directory could not be loaded.');

	return {
		locations: response.data,
		form: await superValidate(
			{ name: '', parentId: '', reason: '' },
			valibot(createLocationSchema),
			{ id: formId }
		)
	};
};

export const actions: Actions = {
	create: async (event) => {
		const form = await superValidate(event, valibot(createLocationSchema), { id: formId });
		if (!form.valid) return fail(400, { form });

		const { parentId, ...data } = form.data;
		const [response, apiError] = await createPhysicalLocation(event, {
			...data,
			...(parentId ? { parentId } : {})
		});
		if (apiError) {
			const details = apiErrorDetails(apiError, 'The physical location could not be created.');
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form });
		}

		redirect(303, '/locations', { type: 'success', message: response.message }, event.cookies);
	}
};
