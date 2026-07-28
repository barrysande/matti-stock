import { randomUUID } from 'node:crypto'
import { beforeCreate, hasMany } from '@adonisjs/lucid/orm'
import { RoleSchema } from '#database/schema'
import RoleVersion from '#models/role_version'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export default class Role extends RoleSchema {
  @beforeCreate()
  static assignUuid(role: Role) {
    role.id = randomUUID()
  }

  @hasMany(() => RoleVersion)
  declare versions: HasMany<typeof RoleVersion>
}
