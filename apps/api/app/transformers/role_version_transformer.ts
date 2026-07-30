import { BaseTransformer } from '@adonisjs/core/transformers'
import type RoleVersion from '#models/role_version'

export default class RoleVersionTransformer extends BaseTransformer<RoleVersion> {
  toObject() {
    return {
      id: this.resource.id,
      version: Number(this.resource.version),
      permissionKeys: this.resource.permissions.map(({ permissionKey }) => permissionKey),
      assignmentCount: Number(this.resource.$extras.assignments_count ?? 0),
      reason: this.resource.reason,
      createdBy: this.resource.createdByAccountId
        ? {
            accountId: this.resource.createdByAccountId,
            displayName: this.resource.createdByAccount.person.displayName,
          }
        : null,
      createdAt: this.resource.createdAt,
    }
  }
}
