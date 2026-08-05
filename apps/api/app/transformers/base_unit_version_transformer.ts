import { BaseTransformer } from '@adonisjs/core/transformers'
import type BaseUnitVersion from '#models/base_unit_version'

export default class BaseUnitVersionTransformer extends BaseTransformer<BaseUnitVersion> {
  toObject() {
    return {
      id: this.resource.id,
      version: Number(this.resource.version),
      changeKind: this.resource.changeKind,
      name: this.resource.name,
      symbol: this.resource.symbol,
      kind: this.resource.kind,
      precision: Number(this.resource.precision),
      archivedAt: this.resource.archivedAt,
      effectiveFrom: this.resource.effectiveFrom,
      effectiveTo: this.resource.effectiveTo,
      reason: this.resource.reason,
      changedBy: {
        accountId: this.resource.changedByAccountId,
        displayName: this.resource.changedByAccount.person.displayName,
      },
      authorization: {
        permissionKey: this.resource.permissionKey,
        roleAssignmentId: this.resource.authorizationRoleAssignmentId,
        delegationId: this.resource.authorizationDelegationId,
        resolvedScope: {
          organizationalUnitId: this.resource.resolvedScopeOrganizationalUnitId,
          name: this.resource.resolvedScopeOrganizationalUnit.name,
        },
      },
    }
  }
}
