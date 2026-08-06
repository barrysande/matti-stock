import { BaseTransformer } from '@adonisjs/core/transformers'
import type CatalogueCategory from '#models/catalogue_category'
import CatalogueCategoryVersionTransformer from '#transformers/catalogue_category_version_transformer'

export default class CatalogueCategoryTransformer extends BaseTransformer<CatalogueCategory> {
  toObject() {
    return {
      id: this.resource.id,
      name: this.resource.name,
      description: this.resource.description,
      parentId: this.resource.parentId,
      mergedIntoCategoryId: this.resource.mergedIntoCategoryId,
      path: String(this.resource.$extras.path),
      depth: Number(this.resource.$extras.depth),
      archivedAt: this.resource.archivedAt,
      createdAt: this.resource.createdAt,
      updatedAt: this.resource.updatedAt,
    }
  }

  forDetailedView() {
    return {
      ...this.toObject(),
      mergedInto: this.resource.mergedIntoCategoryId
        ? {
            id: this.resource.mergedIntoCategory.id,
            name: this.resource.mergedIntoCategory.name,
            description: this.resource.mergedIntoCategory.description,
          }
        : null,
      canonicalMergeTarget: this.resource.$extras.canonicalMergeTarget ?? null,
      versions: CatalogueCategoryVersionTransformer.transform(
        this.whenLoaded(this.resource.versions)
      ),
    }
  }
}
