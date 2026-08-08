import { BaseTransformer } from '@adonisjs/core/transformers'
import type PhysicalLocation from '#models/physical_location'

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
      parent: this.resource.parentId
        ? {
            id: this.resource.parent.id,
            name: this.resource.parent.name,
          }
        : null,
    }
  }
}
