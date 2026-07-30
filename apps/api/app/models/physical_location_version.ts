import { randomUUID } from 'node:crypto'
import { beforeCreate, belongsTo } from '@adonisjs/lucid/orm'
import { PhysicalLocationVersionSchema } from '#database/schema'
import PhysicalLocation from '#models/physical_location'
import UserAccount from '#models/user_account'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class PhysicalLocationVersion extends PhysicalLocationVersionSchema {
  @beforeCreate()
  static assignUuid(version: PhysicalLocationVersion) {
    version.id = randomUUID()
  }

  @belongsTo(() => PhysicalLocation)
  declare physicalLocation: BelongsTo<typeof PhysicalLocation>

  @belongsTo(() => PhysicalLocation, { foreignKey: 'parentId' })
  declare parent: BelongsTo<typeof PhysicalLocation>

  @belongsTo(() => UserAccount, { foreignKey: 'changedByAccountId' })
  declare changedByAccount: BelongsTo<typeof UserAccount>
}
