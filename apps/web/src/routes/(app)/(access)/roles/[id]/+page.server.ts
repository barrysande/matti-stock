import {
	administerRoleSchema,
	renameRoleSchema,
	replaceRolePermissionsSchema
} from '$lib/schemas/role';
import { getPermissions } from '$lib/server/api/permissions';
import {
	archiveRole,
	getRole,
	getRoleHistory,
	renameRole,
	replaceRolePermissions,
	restoreRole
} from '$lib/server/api/roles';
import { requireRoot } from '$lib/server/auth/guards';
import { apiErrorDetails } from '$lib/server/helpers/api-error';
import { positivePage } from '$lib/server/helpers/list-filters';
import { redirectToRole } from '$lib/server/helpers/role-route';
import { error, fail } from '@sveltejs/kit';
import { setFlash } from 'sveltekit-flash-message/server';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';

const formIds = {
	rename: 'role-rename',
	permissions: 'role-permissions-replace',
	archive: 'role-archive',
	restore: 'role-restore'
} as const;

export const load: PageServerLoad = async (event) => {
	requireRoot(event);

	const [roleResult, historyResult, permissionsResult] = await Promise.all([
		getRole(event, event.params.id),
		getRoleHistory(event, event.params.id, positivePage(event.url.searchParams.get('page'))),
		getPermissions(event)
	]);
	const [roleResponse, roleError] = roleResult;
	const [historyResponse, historyError] = historyResult;
	const [permissionsResponse, permissionsError] = permissionsResult;
	if (roleError) {
		error(roleError.status ?? 404, 'The role could not be found.');
	}

	if (historyError) {
		error(historyError.status ?? 502, 'The role history could not be loaded.');
	}

	if (permissionsError) {
		error(permissionsError.status ?? 502, 'The permission registry could not be loaded.');
	}

	const role = roleResponse.data;

	return {
		role,
		history: historyResponse,
		permissions: permissionsResponse.data,
		assignablePermissions: permissionsResponse.data.filter(
			(permission) => permission.customRoleAssignable
		),
		renameForm: await superValidate({ name: role.name, reason: '' }, valibot(renameRoleSchema), {
			id: formIds.rename
		}),
		permissionsForm: await superValidate(
			{ permissionKeys: role.currentVersion.permissionKeys, reason: '' },
			valibot(replaceRolePermissionsSchema),
			{ id: formIds.permissions }
		),
		archiveForm: await superValidate({ reason: '' }, valibot(administerRoleSchema), {
			id: formIds.archive
		}),
		restoreForm: await superValidate({ reason: '' }, valibot(administerRoleSchema), {
			id: formIds.restore
		})
	};
};

export const actions: Actions = {
	rename: async (event) => {
		requireRoot(event);

		const form = await superValidate(event, valibot(renameRoleSchema), { id: formIds.rename });
		if (!form.valid) return fail(400, { form });

		const [response, apiError] = await renameRole(event, event.params.id, form.data);
		if (apiError) {
			const details = apiErrorDetails(apiError, 'The role could not be renamed.');
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form });
		}

		redirectToRole(event, response.message);
	},

	replacePermissions: async (event) => {
		requireRoot(event);

		const form = await superValidate(event, valibot(replaceRolePermissionsSchema), {
			id: formIds.permissions
		});
		if (!form.valid) return fail(400, { form });

		const [response, apiError] = await replaceRolePermissions(event, event.params.id, form.data);
		if (apiError) {
			const details = apiErrorDetails(apiError, 'The role permissions could not be changed.');
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form });
		}

		redirectToRole(event, response.message);
	},

	archive: async (event) => {
		requireRoot(event);

		const form = await superValidate(event, valibot(administerRoleSchema), {
			id: formIds.archive
		});
		if (!form.valid) return fail(400, { form });

		const [response, apiError] = await archiveRole(event, event.params.id, form.data.reason);
		if (apiError) {
			const details = apiErrorDetails(apiError, 'The role could not be archived.');
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form });
		}

		redirectToRole(event, response.message);
	},

	restore: async (event) => {
		requireRoot(event);

		const form = await superValidate(event, valibot(administerRoleSchema), {
			id: formIds.restore
		});
		if (!form.valid) return fail(400, { form });

		const [response, apiError] = await restoreRole(event, event.params.id, form.data.reason);
		if (apiError) {
			const details = apiErrorDetails(apiError, 'The role could not be restored.');
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form });
		}

		redirectToRole(event, response.message);
	}
};
