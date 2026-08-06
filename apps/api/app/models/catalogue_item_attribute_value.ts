import { randomUUID } from 'node:crypto'
import { beforeCreate, belongsTo } from '@adonisjs/lucid/orm'
import { CatalogueItemAttributeValueSchema } from '#database/schema'
import CatalogueItem from '#models/catalogue_item'
import CategoryAttribute from '#models/category_attribute'
import CategoryAttributeChoice from '#models/category_attribute_choice'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class CatalogueItemAttributeValue extends CatalogueItemAttributeValueSchema {
  @beforeCreate()
  static assignUuid(value: CatalogueItemAttributeValue) {
    value.id = randomUUID()
  }

  @belongsTo(() => CatalogueItem)
  declare catalogueItem: BelongsTo<typeof CatalogueItem>

  @belongsTo(() => CategoryAttribute)
  declare categoryAttribute: BelongsTo<typeof CategoryAttribute>

  @belongsTo(() => CategoryAttributeChoice, { foreignKey: 'choiceId' })
  declare choice: BelongsTo<typeof CategoryAttributeChoice>
}
