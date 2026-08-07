import { administerBaseUnitSchema, baseUnitDetailsSchema } from '$lib/schemas/base-unit';
import {
	archiveBaseUnit,
	getBaseUnit,
	restoreBaseUnit,
	updateBaseUnitDetails
} from '$lib/server/api/base-units';
import { requireAuth, requireCatalogueManager } from '$lib/server/auth/guards';
import { apiErrorDetails } from '$lib/server/helpers/api-error';
import type { BaseUnitKind } from '$lib/types/base-units';
import { error, fail } from '@sveltejs/kit';
import { redirect, setFlash } from 'sveltekit-flash-message/server';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

const formIds = {
	details: 'base-unit-details',
	archive: 'base-unit-archive',
	restore: 'base-unit-restore'
} as const;

function redirectToBaseUnit(event: RequestEvent, message: string) {
	redirect(303, `/base-units/${event.params.id}`, { type: 'success', message }, event.cookies);
}

export const load: PageServerLoad = async (event) => {
	requireAuth(event);

	const [response, apiError] = await getBaseUnit(event, event.params.id);
	if (apiError) error(apiError.status ?? 404, 'The base unit could not be found.');

	const unit = response.data;
	return {
		unit,
		detailsForm: await superValidate(
			{
				name: unit.name,
				symbol: unit.symbol,
				kind: unit.kind as BaseUnitKind,
				precision: String(unit.precision) as '0' | '1' | '2' | '3',
				reason: ''
			},
			valibot(baseUnitDetailsSchema),
			{ id: formIds.details }
		),
		archiveForm: await superValidate({ reason: '' }, valibot(administerBaseUnitSchema), {
			id: formIds.archive
		}),
		restoreForm: await superValidate({ reason: '' }, valibot(administerBaseUnitSchema), {
			id: formIds.restore
		})
	};
};

export const actions: Actions = {
	details: async (event) => {
		requireCatalogueManager(event);

		const form = await superValidate(event, valibot(baseUnitDetailsSchema), {
			id: formIds.details
		});
		if (!form.valid) return fail(400, { form });

		const [response, apiError] = await updateBaseUnitDetails(event, event.params.id, {
			...form.data,
			precision: Number(form.data.precision)
		});
		if (apiError) {
			const details = apiErrorDetails(apiError, 'The base unit could not be updated.');
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form });
		}
		redirectToBaseUnit(event, response.message);
	},

	archive: async (event) => {
		requireCatalogueManager(event);

		const form = await superValidate(event, valibot(administerBaseUnitSchema), {
			id: formIds.archive
		});
		if (!form.valid) return fail(400, { form });

		const [response, apiError] = await archiveBaseUnit(event, event.params.id, form.data.reason);
		if (apiError) {
			const details = apiErrorDetails(apiError, 'The base unit could not be archived.');
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form });
		}
		redirectToBaseUnit(event, response.message);
	},

	restore: async (event) => {
		requireCatalogueManager(event);

		const form = await superValidate(event, valibot(administerBaseUnitSchema), {
			id: formIds.restore
		});
		if (!form.valid) return fail(400, { form });

		const [response, apiError] = await restoreBaseUnit(event, event.params.id, form.data.reason);
		if (apiError) {
			const details = apiErrorDetails(apiError, 'The base unit could not be restored.');
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form });
		}
		redirectToBaseUnit(event, response.message);
	}
};
