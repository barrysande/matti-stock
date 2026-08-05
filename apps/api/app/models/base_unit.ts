import { randomUUID } from 'node:crypto'
import { beforeCreate, hasMany } from '@adonisjs/lucid/orm'
import { BaseUnitSchema } from '#database/schema'
import BaseUnitVersion from '#models/base_unit_version'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export default class BaseUnit extends BaseUnitSchema {
  @beforeCreate()
  static assignUuid(unit: BaseUnit) {
    unit.id = randomUUID()
  }

  @hasMany(() => BaseUnitVersion)
  declare versions: HasMany<typeof BaseUnitVersion>
}
