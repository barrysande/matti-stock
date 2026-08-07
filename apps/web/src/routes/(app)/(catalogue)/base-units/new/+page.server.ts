import { baseUnitDetailsSchema } from '$lib/schemas/base-unit';
import { createBaseUnit } from '$lib/server/api/base-units';
import { requireCatalogueManager } from '$lib/server/auth/guards';
import { apiErrorDetails } from '$lib/server/helpers/api-error';
import { fail } from '@sveltejs/kit';
import { redirect, setFlash } from 'sveltekit-flash-message/server';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';

const formId = 'base-unit-create';

export const load: PageServerLoad = async (event) => {
	requireCatalogueManager(event);

	return {
		form: await superValidate(
			{ name: '', symbol: '', kind: 'COUNTABLE' as const, precision: '0' as const, reason: '' },
			valibot(baseUnitDetailsSchema),
			{ id: formId }
		)
	};
};

export const actions: Actions = {
	create: async (event) => {
		requireCatalogueManager(event);

		const form = await superValidate(event, valibot(baseUnitDetailsSchema), { id: formId });
		if (!form.valid) return fail(400, { form });

		const [response, apiError] = await createBaseUnit(event, {
			...form.data,
			precision: Number(form.data.precision)
		});
		if (apiError) {
			const details = apiErrorDetails(apiError, 'The base unit could not be created.');
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form });
		}

		redirect(303, '/base-units', { type: 'success', message: response.message }, event.cookies);
	}
};
