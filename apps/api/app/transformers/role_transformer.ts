import { BaseTransformer } from '@adonisjs/core/transformers'
import type Role from '#models/role'

export default class RoleTransformer extends BaseTransformer<Role> {
  private currentVersion() {
    const current = this.resource.versions[0]
    if (!current) {
      throw new Error(`Role ${this.resource.id} has no permission version`)
    }
    return current
  }

  toObject() {
    const current = this.currentVersion()
    const assignmentCount = Number(this.resource.$extras.assignments_count ?? 0)
    const currentAssignmentCount = Number(current.$extras.assignments_count ?? 0)

    return {
      id: this.resource.id,
      key: this.resource.key,
      name: this.resource.name,
      systemManaged: this.resource.systemManaged,
      archivedAt: this.resource.archivedAt,
      createdAt: this.resource.createdAt,
      updatedAt: this.resource.updatedAt,
      currentVersion: {
        id: current.id,
        version: Number(current.version),
        permissionKeys: current.permissions.map(({ permissionKey }) => permissionKey),
        assignmentCount: currentAssignmentCount,
      },
      olderVersionAssignmentCount: assignmentCount - currentAssignmentCount,
    }
  }

  forDetailedView() {
    return this.toObject()
  }
}
