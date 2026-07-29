import { BaseTransformer } from '@adonisjs/core/transformers'
import type RoleAssignment from '#models/role_assignment'

export default class AccountRoleAssignmentTransformer extends BaseTransformer<RoleAssignment> {
  toObject() {
    return {
      id: this.resource.id,
      role: {
        id: this.resource.roleVersion.role.id,
        key: this.resource.roleVersion.role.key,
        name: this.resource.roleVersion.role.name,
        version: this.resource.roleVersion.version,
      },
      scope: {
        organizationalUnitId: this.resource.scopeOrgUnit.id,
        name: this.resource.scopeOrgUnit.name,
        unitType: this.resource.scopeOrgUnit.unitType,
        mode: this.resource.scopeMode,
      },
      startsAt: this.resource.startsAt,
      expiresAt: this.resource.expiresAt,
      reason: this.resource.reason,
    }
  }
}
