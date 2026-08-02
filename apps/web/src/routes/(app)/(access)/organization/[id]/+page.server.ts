import {
	administerOrganizationalUnitFormSchema,
	administerOrganizationalUnitSchema,
	renameOrganizationalUnitSchema,
	reparentOrganizationalUnitFormSchema,
	reparentOrganizationalUnitSchema
} from '$lib/schemas/organization-unit';
import {
	archiveOrganizationalUnit,
	getOrganizationalUnit,
	getOrganizationalUnits,
	previewOrganizationalAccessImpact,
	renameOrganizationalUnit,
	reparentOrganizationalUnit,
	restoreOrganizationalUnit
} from '$lib/server/api/organizational-units';
import { apiErrorDetails } from '$lib/utils';
import { error, fail } from '@sveltejs/kit';
import { redirect, setFlash } from 'sveltekit-flash-message/server';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

const formIds = {
	rename: 'organizational-unit-rename',
	reparent: 'organizational-unit-reparent',
	archive: 'organizational-unit-archive',
	restore: 'organizational-unit-restore'
} as const;

function invalidatesPreview(code: string | undefined) {
	return (
		code === 'E_STALE_ORGANIZATIONAL_ACCESS_IMPACT' ||
		code === 'E_INVALID_ORGANIZATIONAL_UNIT_CHANGE'
	);
}

function redirectToUnit(event: RequestEvent, message: string) {
	redirect(303, `/organization/${event.params.id}`, { type: 'success', message }, event.cookies);
}

export const load: PageServerLoad = async (event) => {
	const [unitResult, unitsResult] = await Promise.all([
		getOrganizationalUnit(event, event.params.id),
		getOrganizationalUnits(event, {})
	]);
	const [unitResponse, unitError] = unitResult;
	const [unitsResponse, unitsError] = unitsResult;
	if (unitError) error(unitError.status ?? 404, 'The organizational unit could not be found.');
	if (unitsError) {
		error(unitsError.status ?? 502, 'The organizational directory could not be loaded.');
	}
	const reparentParentId =
		unitsResponse.data.find(
			(unit) => unit.unitType === 'DEPARTMENT' && unit.id !== unitResponse.data.parentId
		)?.id ?? '';

	return {
		unit: unitResponse.data,
		units: unitsResponse.data,
		renameForm: await superValidate(
			{ name: unitResponse.data.name, reason: '' },
			valibot(renameOrganizationalUnitSchema),
			{ id: formIds.rename }
		),
		reparentForm: await superValidate(
			{
				parentId: reparentParentId,
				reason: '',
				impactFingerprint: ''
			},
			valibot(reparentOrganizationalUnitFormSchema),
			{ id: formIds.reparent }
		),
		archiveForm: await superValidate(
			{ reason: '', impactFingerprint: '' },
			valibot(administerOrganizationalUnitFormSchema),
			{ id: formIds.archive }
		),
		restoreForm: await superValidate(
			{ reason: '', impactFingerprint: '' },
			valibot(administerOrganizationalUnitFormSchema),
			{ id: formIds.restore }
		)
	};
};

export const actions: Actions = {
	rename: async (event) => {
		const form = await superValidate(event, valibot(renameOrganizationalUnitSchema), {
			id: formIds.rename
		});
		if (!form.valid) return fail(400, { form });

		const [response, apiError] = await renameOrganizationalUnit(event, event.params.id, form.data);
		if (apiError) {
			const details = apiErrorDetails(apiError, 'The organizational unit could not be renamed.');
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form });
		}

		redirectToUnit(event, response.message);
	},

	previewReparent: async (event) => {
		const form = await superValidate(event, valibot(reparentOrganizationalUnitFormSchema), {
			id: formIds.reparent
		});
		if (!form.valid) return fail(400, { form, previewInvalidated: true });

		const [response, apiError] = await previewOrganizationalAccessImpact(event, event.params.id, {
			operation: 'REPARENT',
			parentId: form.data.parentId
		});
		if (apiError) {
			form.data.impactFingerprint = '';
			const details = apiErrorDetails(apiError, 'The access-impact preview could not be loaded.');
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form, previewInvalidated: true });
		}

		form.data.impactFingerprint = response.fingerprint;
		return { form, impact: response, reviewedParentId: form.data.parentId };
	},

	reparent: async (event) => {
		const form = await superValidate(event, valibot(reparentOrganizationalUnitSchema), {
			id: formIds.reparent
		});
		if (!form.valid) return fail(400, { form, previewInvalidated: true });

		const [response, apiError] = await reparentOrganizationalUnit(
			event,
			event.params.id,
			form.data
		);
		if (apiError) {
			const details = apiErrorDetails(apiError, 'The organizational unit could not be moved.');
			const previewInvalidated = invalidatesPreview(details.code);
			if (previewInvalidated) form.data.impactFingerprint = '';
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form, previewInvalidated });
		}

		redirectToUnit(event, response.message);
	},

	previewArchive: async (event) => {
		const form = await superValidate(event, valibot(administerOrganizationalUnitFormSchema), {
			id: formIds.archive
		});
		if (!form.valid) return fail(400, { form, previewInvalidated: true });

		const [response, apiError] = await previewOrganizationalAccessImpact(event, event.params.id, {
			operation: 'ARCHIVE'
		});
		if (apiError) {
			form.data.impactFingerprint = '';
			const details = apiErrorDetails(apiError, 'The access-impact preview could not be loaded.');
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form, previewInvalidated: true });
		}

		form.data.impactFingerprint = response.fingerprint;
		return { form, impact: response };
	},

	archive: async (event) => {
		const form = await superValidate(event, valibot(administerOrganizationalUnitSchema), {
			id: formIds.archive
		});
		if (!form.valid) return fail(400, { form, previewInvalidated: true });

		const [response, apiError] = await archiveOrganizationalUnit(event, event.params.id, form.data);
		if (apiError) {
			const details = apiErrorDetails(apiError, 'The organizational unit could not be archived.');
			const previewInvalidated = invalidatesPreview(details.code);
			if (previewInvalidated) form.data.impactFingerprint = '';
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form, previewInvalidated });
		}

		redirectToUnit(event, response.message);
	},

	previewRestore: async (event) => {
		const form = await superValidate(event, valibot(administerOrganizationalUnitFormSchema), {
			id: formIds.restore
		});
		if (!form.valid) return fail(400, { form, previewInvalidated: true });

		const [response, apiError] = await previewOrganizationalAccessImpact(event, event.params.id, {
			operation: 'RESTORE'
		});
		if (apiError) {
			form.data.impactFingerprint = '';
			const details = apiErrorDetails(apiError, 'The access-impact preview could not be loaded.');
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form, previewInvalidated: true });
		}

		form.data.impactFingerprint = response.fingerprint;
		return { form, impact: response };
	},

	restore: async (event) => {
		const form = await superValidate(event, valibot(administerOrganizationalUnitSchema), {
			id: formIds.restore
		});
		if (!form.valid) return fail(400, { form, previewInvalidated: true });

		const [response, apiError] = await restoreOrganizationalUnit(event, event.params.id, form.data);
		if (apiError) {
			const details = apiErrorDetails(apiError, 'The organizational unit could not be restored.');
			const previewInvalidated = invalidatesPreview(details.code);
			if (previewInvalidated) form.data.impactFingerprint = '';
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form, previewInvalidated });
		}

		redirectToUnit(event, response.message);
	}
};
