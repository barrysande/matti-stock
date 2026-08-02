import {
	administerRoleAssignmentSchema,
	grantRoleAssignmentSchema
} from '$lib/schemas/role-assignment';
import { getOrganizationalUnits } from '$lib/server/api/organizational-units';
import { getPermissions } from '$lib/server/api/permissions';
import {
	cancelRoleAssignment,
	endRoleAssignment,
	getRoleAssignment,
	replaceRoleAssignment
} from '$lib/server/api/role-assignments';
import { getRole } from '$lib/server/api/roles';
import { apiErrorDetails } from '$lib/server/helpers/api-error';
import {
	apiDateToEatInput,
	eatInputToIso,
	optionalEatInputToIso
} from '$lib/server/helpers/date-time';
import type { RoleAssignmentScopeMode } from '$lib/types/role-assignment';
import { error, fail } from '@sveltejs/kit';
import { redirect, setFlash } from 'sveltekit-flash-message/server';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

const formIds = {
	replace: 'role-assignment-replace',
	end: 'role-assignment-end',
	cancel: 'role-assignment-cancel'
} as const;

function redirectToAssignment(event: RequestEvent, message: string) {
	redirect(
		303,
		`/role-assignments/${event.params.id}`,
		{ type: 'success', message },
		event.cookies
	);
}

export const load: PageServerLoad = async (event) => {
	const [assignmentResult, unitsResult, permissionsResult] = await Promise.all([
		getRoleAssignment(event, event.params.id),
		getOrganizationalUnits(event, {}),
		getPermissions(event)
	]);
	const [assignmentResponse, assignmentError] = assignmentResult;
	const [unitsResponse, unitError] = unitsResult;
	const [permissionsResponse, permissionsError] = permissionsResult;
	if (assignmentError)
		error(assignmentError.status ?? 404, 'The role assignment could not be found.');
	if (unitError) error(unitError.status ?? 502, 'Assignment areas could not be loaded.');
	if (permissionsError) error(permissionsError.status ?? 502, 'Permissions could not be loaded.');

	const assignment = assignmentResponse.data;
	const [roleResponse, roleError] = await getRole(event, assignment.role.id);
	if (roleError) error(roleError.status ?? 404, 'The assigned role could not be loaded.');
	const replacementStartsScheduled = assignment.status === 'UPCOMING';

	return {
		assignment,
		role: roleResponse.data,
		permissions: permissionsResponse.data,
		organizationalUnits: unitsResponse.data,
		replaceForm: await superValidate(
			{
				accountId: assignment.account.id,
				roleId: assignment.role.id,
				scopeOrganizationalUnitId: assignment.scope.organizationalUnitId,
				scopeMode: assignment.scope.mode as RoleAssignmentScopeMode,
				startMode: replacementStartsScheduled ? ('SCHEDULED' as const) : ('NOW' as const),
				startsAt: replacementStartsScheduled ? apiDateToEatInput(assignment.startsAt) : '',
				expiresAt: apiDateToEatInput(assignment.expiresAt),
				reason: ''
			},
			valibot(grantRoleAssignmentSchema),
			{ id: formIds.replace }
		),
		endForm: await superValidate({ reason: '' }, valibot(administerRoleAssignmentSchema), {
			id: formIds.end
		}),
		cancelForm: await superValidate({ reason: '' }, valibot(administerRoleAssignmentSchema), {
			id: formIds.cancel
		})
	};
};

export const actions: Actions = {
	replace: async (event) => {
		const form = await superValidate(event, valibot(grantRoleAssignmentSchema), {
			id: formIds.replace
		});
		if (!form.valid) return fail(400, { form });

		const [assignmentResponse, assignmentError] = await getRoleAssignment(event, event.params.id);
		if (assignmentError) {
			setFlash(
				{ type: 'error', message: 'The role assignment could not be reloaded.' },
				event.cookies
			);
			return fail(assignmentError.status ?? 404, { form });
		}
		const assignment = assignmentResponse.data;
		const body = {
			...form.data,
			accountId: assignment.account.id,
			roleId: assignment.role.id,
			startsAt: form.data.startMode === 'SCHEDULED' ? eatInputToIso(form.data.startsAt) : undefined,
			expiresAt: optionalEatInputToIso(form.data.expiresAt)
		};
		const [response, apiError] = await replaceRoleAssignment(event, event.params.id, body);
		if (apiError) {
			const details = apiErrorDetails(apiError, 'The role assignment could not be replaced.');
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form });
		}
		redirectToAssignment(event, response.message);
	},

	end: async (event) => {
		const form = await superValidate(event, valibot(administerRoleAssignmentSchema), {
			id: formIds.end
		});
		if (!form.valid) return fail(400, { form });
		const [response, apiError] = await endRoleAssignment(event, event.params.id, form.data.reason);
		if (apiError) {
			const details = apiErrorDetails(apiError, 'The role assignment could not be ended.');
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form });
		}
		redirectToAssignment(event, response.message);
	},

	cancel: async (event) => {
		const form = await superValidate(event, valibot(administerRoleAssignmentSchema), {
			id: formIds.cancel
		});
		if (!form.valid) return fail(400, { form });
		const [response, apiError] = await cancelRoleAssignment(
			event,
			event.params.id,
			form.data.reason
		);
		if (apiError) {
			const details = apiErrorDetails(apiError, 'The role assignment could not be cancelled.');
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form });
		}
		redirectToAssignment(event, response.message);
	}
};
