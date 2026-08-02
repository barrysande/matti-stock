import type { Data } from 'api/data';

export type RoleAssignmentScopeMode = 'THIS_NODE_ONLY' | 'INCLUDE_DESCENDANTS';
export type RoleAssignmentStatus =
	'UPCOMING' | 'ACTIVE' | 'EXPIRED' | 'ENDED' | 'CANCELLED' | 'REPLACED';

export interface RoleAssignmentDirectoryQuery {
	page?: number;
	accountId?: string;
	roleId?: string;
	scopeOrganizationalUnitId?: string;
	status?: RoleAssignmentStatus;
}

export interface CreateRoleAssignmentBody {
	accountId: string;
	roleId: string;
	scopeOrganizationalUnitId: string;
	scopeMode: RoleAssignmentScopeMode;
	startMode: 'NOW' | 'SCHEDULED';
	startsAt?: string;
	expiresAt?: string | null;
	reason: string;
}

export type ReplaceRoleAssignmentBody = CreateRoleAssignmentBody;

export type RoleAssignmentSummary = Data.RoleAssignment;
export type RoleOption = Data.Role;
export type OrganizationalUnitOption = Data.OrganizationalUnit;

export type AssignmentAccountOption = {
	id: string;
	displayName: string;
	email: string;
	status: string;
};
