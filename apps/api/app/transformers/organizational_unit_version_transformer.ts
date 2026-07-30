import { BaseTransformer } from '@adonisjs/core/transformers'
import type OrganizationalUnitVersion from '#models/organizational_unit_version'

export default class OrganizationalUnitVersionTransformer extends BaseTransformer<OrganizationalUnitVersion> {
  toObject() {
    return {
      id: this.resource.id,
      version: Number(this.resource.version),
      name: this.resource.name,
      unitType: this.resource.unitType,
      parent: this.resource.parentId
        ? {
            id: this.resource.parentId,
            name: this.resource.parent.name,
          }
        : null,
      archivedAt: this.resource.archivedAt,
      effectiveFrom: this.resource.effectiveFrom,
      effectiveTo: this.resource.effectiveTo,
      reason: this.resource.reason,
      changedBy: this.resource.changedByAccountId
        ? {
            accountId: this.resource.changedByAccountId,
            displayName: this.resource.changedByAccount.person.displayName,
          }
        : null,
    }
  }
}
