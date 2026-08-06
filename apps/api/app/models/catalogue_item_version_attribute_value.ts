import { randomUUID } from 'node:crypto'
import { beforeCreate, belongsTo } from '@adonisjs/lucid/orm'
import { CatalogueItemVersionAttributeValueSchema } from '#database/schema'
import CatalogueItemVersion from '#models/catalogue_item_version'
import CategoryAttribute from '#models/category_attribute'
import CategoryAttributeChoice from '#models/category_attribute_choice'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class CatalogueItemVersionAttributeValue extends CatalogueItemVersionAttributeValueSchema {
  @beforeCreate()
  static assignUuid(value: CatalogueItemVersionAttributeValue) {
    value.id = randomUUID()
  }

  @belongsTo(() => CatalogueItemVersion)
  declare catalogueItemVersion: BelongsTo<typeof CatalogueItemVersion>

  @belongsTo(() => CategoryAttribute)
  declare categoryAttribute: BelongsTo<typeof CategoryAttribute>

  @belongsTo(() => CategoryAttributeChoice, { foreignKey: 'choiceId' })
  declare choice: BelongsTo<typeof CategoryAttributeChoice>
}
