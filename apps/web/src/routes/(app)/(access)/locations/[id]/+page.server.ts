import {
	administerLocationSchema,
	renameLocationSchema,
	reparentLocationSchema
} from '$lib/schemas/location';
import {
	archivePhysicalLocation,
	getPhysicalLocation,
	getPhysicalLocations,
	renamePhysicalLocation,
	reparentPhysicalLocation,
	restorePhysicalLocation
} from '$lib/server/api/physical-locations';
import { requireRoot } from '$lib/server/auth/guards';
import { apiErrorDetails } from '$lib/server/helpers/api-error';
import { redirectToPhysicalLocation } from '$lib/server/helpers/physical-location-route';
import { error, fail } from '@sveltejs/kit';
import { setFlash } from 'sveltekit-flash-message/server';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';

const formIds = {
	rename: 'physical-location-rename',
	reparent: 'physical-location-reparent',
	archive: 'physical-location-archive',
	restore: 'physical-location-restore'
} as const;

export const load: PageServerLoad = async (event) => {
	requireRoot(event);

	const [locationResult, locationsResult] = await Promise.all([
		getPhysicalLocation(event, event.params.id),
		getPhysicalLocations(event, {})
	]);
	const [locationResponse, locationError] = locationResult;
	const [locationsResponse, locationsError] = locationsResult;
	if (locationError)
		error(locationError.status ?? 404, 'The physical location could not be found.');
	if (locationsError) {
		error(locationsError.status ?? 502, 'The physical-location directory could not be loaded.');
	}

	const location = locationResponse.data;
	const locations = locationsResponse.data;
	const descendantIds = new Set<string>();
	let foundDescendant = true;
	while (foundDescendant) {
		foundDescendant = false;
		for (const candidate of locations) {
			if (
				!descendantIds.has(candidate.id) &&
				(candidate.parentId === location.id ||
					(candidate.parentId !== null && descendantIds.has(candidate.parentId)))
			) {
				descendantIds.add(candidate.id);
				foundDescendant = true;
			}
		}
	}

	const parentOptions = locations.filter(
		(candidate) =>
			candidate.id !== location.id &&
			candidate.id !== location.parentId &&
			!descendantIds.has(candidate.id)
	);
	const initialParentId = location.parentId ? '' : (parentOptions[0]?.id ?? '');

	return {
		location,
		parentOptions,
		renameForm: await superValidate(
			{ name: location.name, reason: '' },
			valibot(renameLocationSchema),
			{ id: formIds.rename }
		),
		reparentForm: await superValidate(
			{ parentId: initialParentId, reason: '' },
			valibot(reparentLocationSchema),
			{ id: formIds.reparent }
		),
		archiveForm: await superValidate({ reason: '' }, valibot(administerLocationSchema), {
			id: formIds.archive
		}),
		restoreForm: await superValidate({ reason: '' }, valibot(administerLocationSchema), {
			id: formIds.restore
		})
	};
};

export const actions: Actions = {
	rename: async (event) => {
		requireRoot(event);

		const form = await superValidate(event, valibot(renameLocationSchema), {
			id: formIds.rename
		});
		if (!form.valid) return fail(400, { form });

		const [response, apiError] = await renamePhysicalLocation(event, event.params.id, form.data);
		if (apiError) {
			const details = apiErrorDetails(apiError, 'The physical location could not be renamed.');
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form });
		}

		redirectToPhysicalLocation(event, response.message);
	},

	reparent: async (event) => {
		requireRoot(event);

		const form = await superValidate(event, valibot(reparentLocationSchema), {
			id: formIds.reparent
		});
		if (!form.valid) return fail(400, { form });

		const [response, apiError] = await reparentPhysicalLocation(event, event.params.id, {
			parentId: form.data.parentId || null,
			reason: form.data.reason
		});
		if (apiError) {
			const details = apiErrorDetails(apiError, 'The physical location could not be moved.');
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form });
		}

		redirectToPhysicalLocation(event, response.message);
	},

	archive: async (event) => {
		requireRoot(event);

		const form = await superValidate(event, valibot(administerLocationSchema), {
			id: formIds.archive
		});
		if (!form.valid) return fail(400, { form });

		const [response, apiError] = await archivePhysicalLocation(
			event,
			event.params.id,
			form.data.reason
		);
		if (apiError) {
			const details = apiErrorDetails(apiError, 'The physical location could not be archived.');
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form });
		}

		redirectToPhysicalLocation(event, response.message);
	},

	restore: async (event) => {
		requireRoot(event);

		const form = await superValidate(event, valibot(administerLocationSchema), {
			id: formIds.restore
		});
		if (!form.valid) return fail(400, { form });

		const [response, apiError] = await restorePhysicalLocation(
			event,
			event.params.id,
			form.data.reason
		);
		if (apiError) {
			const details = apiErrorDetails(apiError, 'The physical location could not be restored.');
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form });
		}

		redirectToPhysicalLocation(event, response.message);
	}
};
