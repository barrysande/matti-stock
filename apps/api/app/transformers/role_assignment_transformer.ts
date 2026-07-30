import { BaseTransformer } from '@adonisjs/core/transformers'
import type RoleAssignment from '#models/role_assignment'
import type { RoleAssignmentState } from '#types/role_assignment'

export function roleAssignmentSummary(resource: RoleAssignment) {
  const state = resource.$extras.assignmentState as RoleAssignmentState

  return {
    id: resource.id,
    account: {
      id: resource.account.id,
      displayName: resource.account.person.displayName,
      email: resource.account.email,
      status: resource.account.status,
    },
    role: {
      id: resource.roleVersion.role.id,
      key: resource.roleVersion.role.key,
      name: resource.roleVersion.role.name,
      versionId: resource.roleVersion.id,
      version: Number(resource.roleVersion.version),
    },
    scope: {
      organizationalUnitId: resource.scopeOrgUnit.id,
      name: resource.scopeOrgUnit.name,
      path: String(resource.scopeOrgUnit.$extras.path),
      unitType: resource.scopeOrgUnit.unitType,
      mode: resource.scopeMode,
    },
    startsAt: resource.startsAt,
    expiresAt: resource.expiresAt,
    status: state.status,
    effectiveNow: state.effectiveNow,
  }
}

export function roleAssignmentOverview(resource: RoleAssignment) {
  const state = resource.$extras.assignmentState as RoleAssignmentState
  const termination = resource.termination
  const summary = roleAssignmentSummary(resource)

  return {
    ...summary,
    role: {
      ...summary.role,
      isLatestVersion: Boolean(resource.$extras.isLatestRoleVersion),
      permissionKeys: resource.roleVersion.permissions.map(({ permissionKey }) => permissionKey),
    },
    reason: resource.reason,
    grantedBy: resource.grantedByAccountId
      ? {
          accountId: resource.grantedByAccountId,
          displayName: resource.grantedByAccount.person.displayName,
        }
      : null,
    createdAt: resource.createdAt,
    ineffectiveReasons: state.ineffectiveReasons,
    termination: termination
      ? {
          kind: termination.kind,
          effectiveAt: termination.effectiveAt,
          reason: termination.reason,
          terminatedBy: {
            accountId: termination.terminatedByAccountId,
            displayName: termination.terminatedByAccount.person.displayName,
          },
          replacementAssignmentId: termination.replacementAssignmentId,
          createdAt: termination.createdAt,
        }
      : null,
  }
}

export default class RoleAssignmentTransformer extends BaseTransformer<RoleAssignment> {
  toObject() {
    return roleAssignmentSummary(this.resource)
  }

  forOverview() {
    return roleAssignmentOverview(this.resource)
  }
}
