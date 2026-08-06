import { randomUUID } from 'node:crypto'
import { beforeCreate, belongsTo } from '@adonisjs/lucid/orm'
import { CatalogueItemKeywordSchema } from '#database/schema'
import CatalogueItem from '#models/catalogue_item'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class CatalogueItemKeyword extends CatalogueItemKeywordSchema {
  @beforeCreate()
  static assignUuid(keyword: CatalogueItemKeyword) {
    keyword.id = randomUUID()
  }

  @belongsTo(() => CatalogueItem)
  declare catalogueItem: BelongsTo<typeof CatalogueItem>
}
