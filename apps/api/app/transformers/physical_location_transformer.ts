import { BaseTransformer } from '@adonisjs/core/transformers'
import type PhysicalLocation from '#models/physical_location'
import PhysicalLocationVersionTransformer from '#transformers/physical_location_version_transformer'

export default class PhysicalLocationTransformer extends BaseTransformer<PhysicalLocation> {
  toObject() {
    return {
      id: this.resource.id,
      name: this.resource.name,
      parentId: this.resource.parentId,
      path: String(this.resource.$extras.path),
      archivedAt: this.resource.archivedAt,
      createdAt: this.resource.createdAt,
      updatedAt: this.resource.updatedAt,
    }
  }

  forDetailedView() {
    return {
      ...this.toObject(),
      versions: PhysicalLocationVersionTransformer.transform(
        this.whenLoaded(this.resource.versions)
      ),
    }
  }
}
