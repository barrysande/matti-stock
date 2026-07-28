import { randomUUID } from 'node:crypto'
import { beforeCreate, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import { RoleVersionSchema } from '#database/schema'
import Role from '#models/role'
import RoleAssignment from '#models/role_assignment'
import RoleVersionPermission from '#models/role_version_permission'
import UserAccount from '#models/user_account'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class RoleVersion extends RoleVersionSchema {
  @beforeCreate()
  static assignUuid(roleVersion: RoleVersion) {
    roleVersion.id = randomUUID()
  }

  @belongsTo(() => Role)
  declare role: BelongsTo<typeof Role>

  @belongsTo(() => UserAccount, { foreignKey: 'createdByAccountId' })
  declare createdByAccount: BelongsTo<typeof UserAccount>

  @hasMany(() => RoleVersionPermission)
  declare permissions: HasMany<typeof RoleVersionPermission>

  @hasMany(() => RoleAssignment)
  declare assignments: HasMany<typeof RoleAssignment>
}
