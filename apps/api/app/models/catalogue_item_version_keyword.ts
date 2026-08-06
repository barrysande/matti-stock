import { randomUUID } from 'node:crypto'
import { beforeCreate, belongsTo } from '@adonisjs/lucid/orm'
import { CatalogueItemVersionKeywordSchema } from '#database/schema'
import CatalogueItemVersion from '#models/catalogue_item_version'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class CatalogueItemVersionKeyword extends CatalogueItemVersionKeywordSchema {
  @beforeCreate()
  static assignUuid(keyword: CatalogueItemVersionKeyword) {
    keyword.id = randomUUID()
  }

  @belongsTo(() => CatalogueItemVersion)
  declare catalogueItemVersion: BelongsTo<typeof CatalogueItemVersion>
}
