import { randomUUID } from 'node:crypto'
import { beforeCreate, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import { PhysicalLocationSchema } from '#database/schema'
import PhysicalLocationVersion from '#models/physical_location_version'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class PhysicalLocation extends PhysicalLocationSchema {
  @beforeCreate()
  static assignUuid(location: PhysicalLocation) {
    location.id = randomUUID()
  }

  @belongsTo(() => PhysicalLocation, { foreignKey: 'parentId' })
  declare parent: BelongsTo<typeof PhysicalLocation>

  @hasMany(() => PhysicalLocation, { foreignKey: 'parentId' })
  declare children: HasMany<typeof PhysicalLocation>

  @hasMany(() => PhysicalLocationVersion)
  declare versions: HasMany<typeof PhysicalLocationVersion>
}
