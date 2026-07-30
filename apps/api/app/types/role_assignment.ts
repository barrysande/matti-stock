import type { DateTime } from 'luxon'
import type Delegation from '#models/delegation'
import type RoleAssignment from '#models/role_assignment'

export type RoleAssignmentScopeMode = 'THIS_NODE_ONLY' | 'INCLUDE_DESCENDANTS'
export type RoleAssignmentStartMode = 'NOW' | 'SCHEDULED'
export type RoleAssignmentTerminationKind = 'ENDED' | 'CANCELLED' | 'REPLACED'
export type RoleAssignmentStatus =
  'UPCOMING' | 'ACTIVE' | 'EXPIRED' | 'ENDED' | 'CANCELLED' | 'REPLACED'

export type RoleAssignmentIneffectiveReason =
  | 'ACCOUNT_NOT_ACTIVE'
  | 'ROLE_ARCHIVED'
  | 'SCOPE_ARCHIVED'
  | 'NOT_STARTED'
  | 'EXPIRED'
  | 'TERMINATED'

export interface EffectiveAccessGrant {
  evidenceType: 'DIRECT' | 'DELEGATED'
  assignment: RoleAssignment
  assignmentId: string
  delegation: Delegation | null
  delegationId: string | null
  delegatorAccountId: string | null
  delegateAccountId: string | null
  permissionKey: string
  roleId: string
  roleKey: string
  roleName: string
  roleVersionId: string
  roleVersion: number
  declaredScopeOrganizationalUnitId: string
  resolvedScopeOrganizationalUnitId: string
  scopeMode: RoleAssignmentScopeMode
}

export interface RoleAssignmentState {
  status: RoleAssignmentStatus
  effectiveNow: boolean
  ineffectiveReasons: RoleAssignmentIneffectiveReason[]
}

export interface RootCoverageInterval {
  accountId: string
  startsAt: DateTime
  endsAt: DateTime | null
}
