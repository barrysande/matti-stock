import { grantRoleAssignmentSchema } from '$lib/schemas/role-assignment';
import { getAccounts, getAccount } from '$lib/server/api/accounts';
import { getOrganizationalUnits } from '$lib/server/api/organizational-units';
import { createRoleAssignment } from '$lib/server/api/role-assignments';
import { getRoles } from '$lib/server/api/roles';
import { requireRoot } from '$lib/server/auth/guards';
import { apiErrorDetails } from '$lib/server/helpers/api-error';
import { eatInputToIso, optionalEatInputToIso } from '$lib/server/helpers/date-time';
import { optionalFilter, positivePage } from '$lib/server/helpers/list-filters';
import { error, fail } from '@sveltejs/kit';
import { redirect, setFlash } from 'sveltekit-flash-message/server';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';

const formId = 'role-assignment-create';

export const load: PageServerLoad = async (event) => {
	requireRoot(event);

	const selectedAccountId = optionalFilter(event.url.searchParams.get('accountId'));
	const accountQuery = {
		page: positivePage(event.url.searchParams.get('page')),
		search: optionalFilter(event.url.searchParams.get('search'))
	};

	const [accountsResult, rolesResult, unitsResult, selectedAccountResult] = await Promise.all([
		getAccounts(event, accountQuery),
		getRoles(event, {}),
		getOrganizationalUnits(event, {}),
		selectedAccountId ? getAccount(event, selectedAccountId) : Promise.resolve(null)
	]);
	const [accounts, accountError] = accountsResult;
	const [roles, roleError] = rolesResult;
	const [units, unitError] = unitsResult;
	if (accountError) error(accountError.status ?? 502, 'Accounts could not be loaded.');
	if (roleError) error(roleError.status ?? 502, 'Roles could not be loaded.');
	if (unitError) error(unitError.status ?? 502, 'Assignment areas could not be loaded.');

	if (selectedAccountResult?.[1]) {
		error(selectedAccountResult[1].status ?? 404, 'The selected account could not be found.');
	}

	const selectedAccount = selectedAccountResult?.[0]?.data ?? null;
	if (selectedAccount && !['ACTIVE', 'INVITED'].includes(selectedAccount.status)) {
		error(400, 'Only active or invited accounts may receive a role assignment.');
	}

	return {
		accounts,
		accountFilters: accountQuery,
		selectedAccount,
		roles: roles.data,
		organizationalUnits: units.data,
		form: await superValidate(
			{
				accountId: selectedAccount?.id ?? '',
				roleId: '',
				scopeOrganizationalUnitId: '',
				scopeMode: 'THIS_NODE_ONLY' as const,
				startMode: 'NOW' as const,
				startsAt: '',
				expiresAt: '',
				reason: ''
			},
			valibot(grantRoleAssignmentSchema),
			{ id: formId }
		)
	};
};

export const actions: Actions = {
	create: async (event) => {
		requireRoot(event);

		const form = await superValidate(event, valibot(grantRoleAssignmentSchema), { id: formId });
		if (!form.valid) return fail(400, { form });

		const body = {
			...form.data,
			startsAt: form.data.startMode === 'SCHEDULED' ? eatInputToIso(form.data.startsAt) : undefined,
			expiresAt: optionalEatInputToIso(form.data.expiresAt)
		};
		const [response, apiError] = await createRoleAssignment(event, body);
		if (apiError) {
			const details = apiErrorDetails(apiError, 'The role assignment could not be created.');
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form });
		}

		redirect(
			303,
			`/role-assignments?accountId=${form.data.accountId}`,
			{ type: 'success', message: response.message },
			event.cookies
		);
	}
};
