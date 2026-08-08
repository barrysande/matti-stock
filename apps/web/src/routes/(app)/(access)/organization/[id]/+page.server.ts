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
	getOrganizationalUnitHistory,
	getOrganizationalUnits,
	previewOrganizationalAccessImpact,
	renameOrganizationalUnit,
	reparentOrganizationalUnit,
	restoreOrganizationalUnit
} from '$lib/server/api/organizational-units';
import { requireRoot } from '$lib/server/auth/guards';
import { apiErrorDetails } from '$lib/server/helpers/api-error';
import { positivePage } from '$lib/server/helpers/list-filters';
import {
	organizationalUnitChangeInvalidatesPreview,
	redirectToOrganizationalUnit
} from '$lib/server/helpers/organization-unit-route';
import { error, fail } from '@sveltejs/kit';
import { setFlash } from 'sveltekit-flash-message/server';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';

const formIds = {
	rename: 'organizational-unit-rename',
	reparent: 'organizational-unit-reparent',
	archive: 'organizational-unit-archive',
	restore: 'organizational-unit-restore'
} as const;

export const load: PageServerLoad = async (event) => {
	requireRoot(event);

	const [unitResult, historyResult, unitsResult] = await Promise.all([
		getOrganizationalUnit(event, event.params.id),
		getOrganizationalUnitHistory(
			event,
			event.params.id,
			positivePage(event.url.searchParams.get('page'))
		),
		getOrganizationalUnits(event, {})
	]);
	const [unitResponse, unitError] = unitResult;
	const [historyResponse, historyError] = historyResult;
	const [unitsResponse, unitsError] = unitsResult;
	if (unitError) {
		error(unitError.status ?? 404, 'The organizational unit could not be found.');
	}

	if (historyError) {
		error(historyError.status ?? 502, 'The organizational history could not be loaded.');
	}

	if (unitsError) {
		error(unitsError.status ?? 502, 'The organizational directory could not be loaded.');
	}

	const reparentParentId =
		unitsResponse.data.find(
			(unit) => unit.unitType === 'DEPARTMENT' && unit.id !== unitResponse.data.parentId
		)?.id ?? '';

	return {
		unit: unitResponse.data,
		history: historyResponse,
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
		requireRoot(event);

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

		redirectToOrganizationalUnit(event, response.message);
	},

	previewReparent: async (event) => {
		requireRoot(event);

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
		requireRoot(event);

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
			const previewInvalidated = organizationalUnitChangeInvalidatesPreview(details.code);
			if (previewInvalidated) form.data.impactFingerprint = '';
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form, previewInvalidated });
		}

		redirectToOrganizationalUnit(event, response.message);
	},

	previewArchive: async (event) => {
		requireRoot(event);

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
		requireRoot(event);

		const form = await superValidate(event, valibot(administerOrganizationalUnitSchema), {
			id: formIds.archive
		});
		if (!form.valid) return fail(400, { form, previewInvalidated: true });

		const [response, apiError] = await archiveOrganizationalUnit(event, event.params.id, form.data);
		if (apiError) {
			const details = apiErrorDetails(apiError, 'The organizational unit could not be archived.');
			const previewInvalidated = organizationalUnitChangeInvalidatesPreview(details.code);
			if (previewInvalidated) form.data.impactFingerprint = '';
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form, previewInvalidated });
		}

		redirectToOrganizationalUnit(event, response.message);
	},

	previewRestore: async (event) => {
		requireRoot(event);

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
		requireRoot(event);

		const form = await superValidate(event, valibot(administerOrganizationalUnitSchema), {
			id: formIds.restore
		});
		if (!form.valid) return fail(400, { form, previewInvalidated: true });

		const [response, apiError] = await restoreOrganizationalUnit(event, event.params.id, form.data);
		if (apiError) {
			const details = apiErrorDetails(apiError, 'The organizational unit could not be restored.');
			const previewInvalidated = organizationalUnitChangeInvalidatesPreview(details.code);
			if (previewInvalidated) form.data.impactFingerprint = '';
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form, previewInvalidated });
		}

		redirectToOrganizationalUnit(event, response.message);
	}
};
