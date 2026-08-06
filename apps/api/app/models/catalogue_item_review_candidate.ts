import { randomUUID } from 'node:crypto'
import { beforeCreate, belongsTo } from '@adonisjs/lucid/orm'
import { CatalogueItemReviewCandidateSchema } from '#database/schema'
import CatalogueItem from '#models/catalogue_item'
import CatalogueItemVersion from '#models/catalogue_item_version'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class CatalogueItemReviewCandidate extends CatalogueItemReviewCandidateSchema {
  @beforeCreate()
  static assignUuid(candidate: CatalogueItemReviewCandidate) {
    candidate.id = randomUUID()
  }

  @belongsTo(() => CatalogueItemVersion)
  declare catalogueItemVersion: BelongsTo<typeof CatalogueItemVersion>

  @belongsTo(() => CatalogueItem, { foreignKey: 'candidateCatalogueItemId' })
  declare candidateCatalogueItem: BelongsTo<typeof CatalogueItem>
}
