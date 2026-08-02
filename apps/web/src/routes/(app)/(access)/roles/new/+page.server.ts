import { createRoleSchema } from '$lib/schemas/role';
import { getPermissions } from '$lib/server/api/permissions';
import { createRole } from '$lib/server/api/roles';
import { requireRoot } from '$lib/server/auth/guards';
import { apiErrorDetails } from '$lib/server/helpers/api-error';
import { error, fail } from '@sveltejs/kit';
import { redirect, setFlash } from 'sveltekit-flash-message/server';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';

const formId = 'role-create';

export const load: PageServerLoad = async (event) => {
	requireRoot(event);

	const [response, apiError] = await getPermissions(event);
	if (apiError) error(apiError.status ?? 502, 'The permission registry could not be loaded.');

	return {
		permissions: response.data.filter((permission) => permission.customRoleAssignable),
		form: await superValidate(
			{ name: '', permissionKeys: [], reason: '' },
			valibot(createRoleSchema),
			{ id: formId }
		)
	};
};

export const actions: Actions = {
	create: async (event) => {
		requireRoot(event);

		const form = await superValidate(event, valibot(createRoleSchema), { id: formId });
		if (!form.valid) return fail(400, { form });

		const [response, apiError] = await createRole(event, form.data);
		if (apiError) {
			const details = apiErrorDetails(apiError, 'The role could not be created.');
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form });
		}

		redirect(303, '/roles', { type: 'success', message: response.message }, event.cookies);
	}
};
