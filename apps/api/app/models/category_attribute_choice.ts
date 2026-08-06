import { randomUUID } from 'node:crypto'
import { beforeCreate, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import { CategoryAttributeChoiceSchema } from '#database/schema'
import CategoryAttribute from '#models/category_attribute'
import CategoryAttributeChoiceVersion from '#models/category_attribute_choice_version'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class CategoryAttributeChoice extends CategoryAttributeChoiceSchema {
  @beforeCreate()
  static assignUuid(choice: CategoryAttributeChoice) {
    choice.id = randomUUID()
  }

  @belongsTo(() => CategoryAttribute)
  declare categoryAttribute: BelongsTo<typeof CategoryAttribute>

  @hasMany(() => CategoryAttributeChoiceVersion)
  declare versions: HasMany<typeof CategoryAttributeChoiceVersion>
}
