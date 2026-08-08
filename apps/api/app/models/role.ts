import { randomUUID } from 'node:crypto'
import { beforeCreate, hasMany, hasManyThrough } from '@adonisjs/lucid/orm'
import { RoleSchema } from '#database/schema'
import RoleAssignment from '#models/role_assignment'
import RoleVersion from '#models/role_version'
import type { HasMany, HasManyThrough } from '@adonisjs/lucid/types/relations'

export default class Role extends RoleSchema {
  @beforeCreate()
  static assignUuid(role: Role) {
    role.id = randomUUID()
  }

  @hasMany(() => RoleVersion)
  declare versions: HasMany<typeof RoleVersion>

  @hasManyThrough([() => RoleAssignment, () => RoleVersion], {
    throughLocalKey: 'id',
    throughForeignKey: 'roleVersionId',
    foreignKey: 'roleId',
    localKey: 'id',
  })
  declare assignments: HasManyThrough<typeof RoleAssignment>
}
