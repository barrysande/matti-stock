import { BaseTransformer } from '@adonisjs/core/transformers'
import type OrganizationalUnit from '#models/organizational_unit'

export default class OrganizationalUnitTransformer extends BaseTransformer<OrganizationalUnit> {
  toObject() {
    return {
      id: this.resource.id,
      name: this.resource.name,
      unitType: this.resource.unitType,
      parentId: this.resource.parentId,
      path: String(this.resource.$extras.path),
      archivedAt: this.resource.archivedAt,
      createdAt: this.resource.createdAt,
      updatedAt: this.resource.updatedAt,
    }
  }

  forDetailedView() {
    return this.toObject()
  }
}
