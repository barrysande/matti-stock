import { randomUUID } from 'node:crypto'
import { beforeCreate, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import { OrganizationalUnitSchema } from '#database/schema'
import RoleAssignment from '#models/role_assignment'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class OrganizationalUnit extends OrganizationalUnitSchema {
  @beforeCreate()
  static assignUuid(unit: OrganizationalUnit) {
    unit.id = randomUUID()
  }

  @belongsTo(() => OrganizationalUnit, { foreignKey: 'parentId' })
  declare parent: BelongsTo<typeof OrganizationalUnit>

  @hasMany(() => OrganizationalUnit, { foreignKey: 'parentId' })
  declare children: HasMany<typeof OrganizationalUnit>

  @hasMany(() => RoleAssignment, { foreignKey: 'scopeOrgUnitId' })
  declare roleAssignments: HasMany<typeof RoleAssignment>
}
