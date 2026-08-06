import { randomUUID } from 'node:crypto'
import { beforeCreate, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import { CategoryAttributeSchema } from '#database/schema'
import CatalogueCategory from '#models/catalogue_category'
import CatalogueItemAttributeValue from '#models/catalogue_item_attribute_value'
import CategoryAttributeChoice from '#models/category_attribute_choice'
import CategoryAttributeVersion from '#models/category_attribute_version'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class CategoryAttribute extends CategoryAttributeSchema {
  @beforeCreate()
  static assignUuid(attribute: CategoryAttribute) {
    attribute.id = randomUUID()
  }

  @belongsTo(() => CatalogueCategory)
  declare catalogueCategory: BelongsTo<typeof CatalogueCategory>

  @hasMany(() => CategoryAttributeChoice)
  declare choices: HasMany<typeof CategoryAttributeChoice>

  @hasMany(() => CategoryAttributeVersion)
  declare versions: HasMany<typeof CategoryAttributeVersion>

  @hasMany(() => CatalogueItemAttributeValue)
  declare catalogueItemValues: HasMany<typeof CatalogueItemAttributeValue>
}
