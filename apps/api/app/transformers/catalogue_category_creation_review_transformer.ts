import { BaseTransformer } from '@adonisjs/core/transformers'
import type { CatalogueCategorySimilarityCandidate } from '#services/catalogue_category_similarity_service'

export default class CatalogueCategoryCreationReviewTransformer extends BaseTransformer<CatalogueCategorySimilarityCandidate> {
  toObject() {
    const { category, matchKind } = this.resource

    return {
      id: category.id,
      name: category.name,
      description: category.description,
      parentId: category.parentId,
      mergedIntoCategoryId: category.mergedIntoCategoryId,
      path: String(category.$extras.path),
      depth: Number(category.$extras.depth),
      archivedAt: category.archivedAt,
      matchKind,
    }
  }
}
