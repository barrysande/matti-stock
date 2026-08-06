import { BaseTransformer } from '@adonisjs/core/transformers'
import CatalogueItemTransformer from '#transformers/catalogue_item_transformer'
import type { CatalogueSimilarityCandidate } from '#services/catalogue_item_similarity_service'
import type { CatalogueItemTrackingMethod } from '#types/catalogue'

interface CatalogueItemReview {
  trackingGuidance: {
    recommendation: CatalogueItemTrackingMethod | null
    explanation: string
  }
  candidates: CatalogueSimilarityCandidate[]
  fingerprint: string
}

export default class CatalogueItemReviewTransformer extends BaseTransformer<CatalogueItemReview> {
  toObject() {
    for (const candidate of this.resource.candidates) {
      candidate.item.$extras.primaryMatchKind = candidate.primaryMatchKind
    }
    return {
      trackingGuidance: this.resource.trackingGuidance,
      candidates: CatalogueItemTransformer.transform(
        this.resource.candidates.map(({ item }) => item)
      ).useVariant('forSimilarityCandidate'),
      fingerprint: this.resource.fingerprint,
    }
  }
}
