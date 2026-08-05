import { randomUUID } from 'node:crypto'
import { beforeCreate, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import { CatalogueCategorySchema } from '#database/schema'
import CatalogueCategoryVersion from '#models/catalogue_category_version'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class CatalogueCategory extends CatalogueCategorySchema {
  @beforeCreate()
  static assignUuid(category: CatalogueCategory) {
    category.id = randomUUID()
  }

  @belongsTo(() => CatalogueCategory, { foreignKey: 'parentId' })
  declare parent: BelongsTo<typeof CatalogueCategory>

  @hasMany(() => CatalogueCategory, { foreignKey: 'parentId' })
  declare children: HasMany<typeof CatalogueCategory>

  @hasMany(() => CatalogueCategoryVersion)
  declare versions: HasMany<typeof CatalogueCategoryVersion>
}
