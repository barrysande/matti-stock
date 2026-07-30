import { BaseTransformer } from '@adonisjs/core/transformers'
import type Role from '#models/role'
import RoleVersionTransformer from '#transformers/role_version_transformer'

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
    const olderVersionAssignmentCount = this.resource.versions
      .slice(1)
      .reduce((total, version) => total + Number(version.$extras.assignments_count ?? 0), 0)

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
        assignmentCount: Number(current.$extras.assignments_count ?? 0),
      },
      olderVersionAssignmentCount,
    }
  }

  forOverview() {
    return {
      ...this.toObject(),
      versions: RoleVersionTransformer.transform(this.resource.versions),
    }
  }
}
