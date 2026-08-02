import {
	createOrganizationalUnitFormSchema,
	createOrganizationalUnitSchema
} from '$lib/schemas/organization-unit';
import {
	createOrganizationalUnit,
	getOrganizationalUnits,
	previewOrganizationalAccessImpact
} from '$lib/server/api/organizational-units';
import { apiErrorDetails } from '$lib/server/helpers/api-error';
import { error, fail } from '@sveltejs/kit';
import { redirect, setFlash } from 'sveltekit-flash-message/server';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';

const formId = 'organizational-unit-create';

export const load: PageServerLoad = async (event) => {
	const [response, apiError] = await getOrganizationalUnits(event, {});
	if (apiError) error(apiError.status ?? 502, 'The organizational directory could not be loaded.');

	const units = response.data;
	const institute = units.find((unit) => unit.unitType === 'INSTITUTE');
	if (!institute) error(500, 'The institute root is unavailable.');

	return {
		units,
		form: await superValidate(
			{
				name: '',
				unitType: 'DEPARTMENT' as const,
				parentId: institute.id,
				reason: '',
				impactFingerprint: ''
			},
			valibot(createOrganizationalUnitFormSchema),
			{ id: formId }
		)
	};
};

export const actions: Actions = {
	preview: async (event) => {
		const form = await superValidate(event, valibot(createOrganizationalUnitFormSchema), {
			id: formId
		});
		if (!form.valid) return fail(400, { form, previewInvalidated: true });

		const [response, apiError] = await previewOrganizationalAccessImpact(
			event,
			form.data.parentId,
			{
				operation: 'CREATE_CHILD',
				childUnitType: form.data.unitType
			}
		);
		if (apiError) {
			form.data.impactFingerprint = '';
			const details = apiErrorDetails(apiError, 'The access-impact preview could not be loaded.');
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form, previewInvalidated: true });
		}

		form.data.impactFingerprint = response.fingerprint;
		return {
			form,
			impact: response,
			reviewedSelection: {
				unitType: form.data.unitType,
				parentId: form.data.parentId
			}
		};
	},
	create: async (event) => {
		const form = await superValidate(event, valibot(createOrganizationalUnitSchema), {
			id: formId
		});
		if (!form.valid) return fail(400, { form });

		const [response, apiError] = await createOrganizationalUnit(event, form.data);
		if (apiError) {
			const details = apiErrorDetails(apiError, 'The organizational unit could not be created.');
			const previewInvalidated =
				details.code === 'E_STALE_ORGANIZATIONAL_ACCESS_IMPACT' ||
				details.code === 'E_INVALID_ORGANIZATIONAL_UNIT_CHANGE';
			if (previewInvalidated) form.data.impactFingerprint = '';

			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form, previewInvalidated });
		}

		redirect(303, '/organization', { type: 'success', message: response.message }, event.cookies);
	}
};
