import { randomUUID } from 'node:crypto'
import { beforeCreate, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import { CatalogueItemSchema } from '#database/schema'
import BaseUnit from '#models/base_unit'
import CatalogueCategory from '#models/catalogue_category'
import CatalogueItemKeyword from '#models/catalogue_item_keyword'
import CatalogueItemVersion from '#models/catalogue_item_version'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class CatalogueItem extends CatalogueItemSchema {
  @beforeCreate()
  static assignUuid(item: CatalogueItem) {
    item.id = randomUUID()
  }

  @belongsTo(() => CatalogueCategory)
  declare catalogueCategory: BelongsTo<typeof CatalogueCategory>

  @belongsTo(() => BaseUnit)
  declare baseUnit: BelongsTo<typeof BaseUnit>

  @hasMany(() => CatalogueItemKeyword)
  declare keywords: HasMany<typeof CatalogueItemKeyword>

  @hasMany(() => CatalogueItemVersion)
  declare versions: HasMany<typeof CatalogueItemVersion>
}
