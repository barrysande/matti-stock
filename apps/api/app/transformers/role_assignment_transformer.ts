import { BaseTransformer } from '@adonisjs/core/transformers'
import type RoleAssignment from '#models/role_assignment'
import type { RoleAssignmentState } from '#types/role_assignment'

export default class RoleAssignmentTransformer extends BaseTransformer<RoleAssignment> {
  toObject() {
    const state = this.resource.$extras.assignmentState as RoleAssignmentState
    const termination = this.resource.termination

    return {
      id: this.resource.id,
      account: {
        id: this.resource.account.id,
        displayName: this.resource.account.person.displayName,
        email: this.resource.account.email,
        status: this.resource.account.status,
      },
      role: {
        id: this.resource.roleVersion.role.id,
        key: this.resource.roleVersion.role.key,
        name: this.resource.roleVersion.role.name,
        versionId: this.resource.roleVersion.id,
        version: Number(this.resource.roleVersion.version),
        isLatestVersion: Boolean(this.resource.$extras.isLatestRoleVersion),
        permissionKeys: this.resource.roleVersion.permissions.map(
          ({ permissionKey }) => permissionKey
        ),
      },
      scope: {
        organizationalUnitId: this.resource.scopeOrgUnit.id,
        name: this.resource.scopeOrgUnit.name,
        path: String(this.resource.scopeOrgUnit.$extras.path),
        unitType: this.resource.scopeOrgUnit.unitType,
        mode: this.resource.scopeMode,
      },
      startsAt: this.resource.startsAt,
      expiresAt: this.resource.expiresAt,
      reason: this.resource.reason,
      grantedBy: this.resource.grantedByAccountId
        ? {
            accountId: this.resource.grantedByAccountId,
            displayName: this.resource.grantedByAccount.person.displayName,
          }
        : null,
      createdAt: this.resource.createdAt,
      status: state.status,
      effectiveNow: state.effectiveNow,
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
}
