import { BaseTransformer } from '@adonisjs/core/transformers'
import type CatalogueItem from '#models/catalogue_item'
import { trackingGuidance } from '#utils/catalogue_item'
import type { CatalogueItemStockType } from '#types/catalogue'

export default class CatalogueItemTransformer extends BaseTransformer<CatalogueItem> {
  toObject() {
    return {
      catalogueCode: this.resource.catalogueCode,
      name: this.resource.name,
      description: this.resource.description,
      keywords: this.resource.keywords.map(({ keyword }) => keyword),
      category: {
        id: this.resource.catalogueCategoryId,
        name: this.resource.catalogueCategory.name,
      },
      stockType: this.resource.stockType,
      trackingMethod: this.resource.trackingMethod,
      trackingGuidance: trackingGuidance(this.resource.stockType as CatalogueItemStockType),
      baseUnit: {
        id: this.resource.baseUnitId,
        name: this.resource.baseUnit.name,
        symbol: this.resource.baseUnit.symbol,
        kind: this.resource.baseUnit.kind,
        precision: Number(this.resource.baseUnit.precision),
      },
      identificationStatus: this.resource.identificationStatus,
      inventorySemanticsLockedAt: this.resource.inventorySemanticsLockedAt,
      archivedAt: this.resource.archivedAt,
      createdAt: this.resource.createdAt,
      updatedAt: this.resource.updatedAt,
    }
  }

  forLookup() {
    return {
      ...this.toObject(),
      matchKind: this.resource.$extras.matchKind,
    }
  }

  forSimilarityCandidate() {
    return {
      catalogueCode: this.resource.catalogueCode,
      name: this.resource.name,
      description: this.resource.description,
      keywords: this.resource.keywords.map(({ keyword }) => keyword),
      category: {
        id: this.resource.catalogueCategoryId,
        name: this.resource.catalogueCategory.name,
      },
      primaryMatchKind: this.resource.$extras.primaryMatchKind,
    }
  }

  forDetailedView() {
    return this.toObject()
  }
}
