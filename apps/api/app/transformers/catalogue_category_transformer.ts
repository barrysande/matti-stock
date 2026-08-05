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
      path: String(this.resource.$extras.path),
      depth: Number(this.resource.$extras.depth),
      archivedAt: this.resource.archivedAt,
      createdAt: this.resource.createdAt,
      updatedAt: this.resource.updatedAt,
    }
  }

  forOverview() {
    return {
      ...this.toObject(),
      versions: CatalogueCategoryVersionTransformer.transform(
        this.whenLoaded(this.resource.versions)
      ),
    }
  }
}
