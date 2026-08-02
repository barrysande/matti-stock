import { optionalFilter, positivePage } from '$lib/server/helpers/list-filters';
import { getOrganizationalUnits } from '$lib/server/api/organizational-units';
import { getRoleAssignments } from '$lib/server/api/role-assignments';
import { getRoles } from '$lib/server/api/roles';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const statuses = ['UPCOMING', 'ACTIVE', 'EXPIRED', 'ENDED', 'CANCELLED', 'REPLACED'] as const;

function assignmentStatus(value: string | null) {
	return statuses.find((status) => status === value);
}

export const load: PageServerLoad = async (event) => {
	const query = {
		page: positivePage(event.url.searchParams.get('page')),
		accountId: optionalFilter(event.url.searchParams.get('accountId')),
		roleId: optionalFilter(event.url.searchParams.get('roleId')),
		scopeOrganizationalUnitId: optionalFilter(
			event.url.searchParams.get('scopeOrganizationalUnitId')
		),
		status: assignmentStatus(event.url.searchParams.get('status'))
	};
	const [assignmentsResult, rolesResult, unitsResult] = await Promise.all([
		getRoleAssignments(event, query),
		getRoles(event, { includeArchived: true }),
		getOrganizationalUnits(event, { includeArchived: true })
	]);
	const [directory, assignmentError] = assignmentsResult;
	const [roles, roleError] = rolesResult;
	const [units, unitError] = unitsResult;
	if (assignmentError)
		error(assignmentError.status ?? 502, 'The assignment directory could not be loaded.');
	if (roleError) error(roleError.status ?? 502, 'Roles could not be loaded.');
	if (unitError) error(unitError.status ?? 502, 'Assignment areas could not be loaded.');

	return {
		directory,
		roles: roles.data,
		organizationalUnits: units.data,
		filters: query
	};
};
