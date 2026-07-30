import { randomUUID } from 'node:crypto'
import { beforeCreate, belongsTo } from '@adonisjs/lucid/orm'
import { OrganizationalUnitVersionSchema } from '#database/schema'
import OrganizationalUnit from '#models/organizational_unit'
import UserAccount from '#models/user_account'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class OrganizationalUnitVersion extends OrganizationalUnitVersionSchema {
  @beforeCreate()
  static assignUuid(version: OrganizationalUnitVersion) {
    version.id = randomUUID()
  }

  @belongsTo(() => OrganizationalUnit)
  declare organizationalUnit: BelongsTo<typeof OrganizationalUnit>

  @belongsTo(() => OrganizationalUnit, { foreignKey: 'parentId' })
  declare parent: BelongsTo<typeof OrganizationalUnit>

  @belongsTo(() => UserAccount, { foreignKey: 'changedByAccountId' })
  declare changedByAccount: BelongsTo<typeof UserAccount>
}
