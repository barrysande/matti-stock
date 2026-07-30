import { BaseTransformer } from '@adonisjs/core/transformers'
import type PhysicalLocationVersion from '#models/physical_location_version'

export default class PhysicalLocationVersionTransformer extends BaseTransformer<PhysicalLocationVersion> {
  toObject() {
    return {
      id: this.resource.id,
      version: Number(this.resource.version),
      name: this.resource.name,
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
      changedBy: {
        accountId: this.resource.changedByAccountId,
        displayName: this.resource.changedByAccount.person.displayName,
      },
    }
  }
}
