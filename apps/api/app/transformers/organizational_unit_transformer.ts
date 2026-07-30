import { BaseTransformer } from '@adonisjs/core/transformers'
import type OrganizationalUnit from '#models/organizational_unit'
import OrganizationalUnitVersionTransformer from '#transformers/organizational_unit_version_transformer'

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

  forOverview() {
    return {
      ...this.toObject(),
      versions: OrganizationalUnitVersionTransformer.transform(
        this.whenLoaded(this.resource.versions)
      ),
    }
  }
}
