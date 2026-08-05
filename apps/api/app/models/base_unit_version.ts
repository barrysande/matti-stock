import { randomUUID } from 'node:crypto'
import { beforeCreate, belongsTo } from '@adonisjs/lucid/orm'
import { BaseUnitVersionSchema } from '#database/schema'
import BaseUnit from '#models/base_unit'
import Delegation from '#models/delegation'
import OrganizationalUnit from '#models/organizational_unit'
import RoleAssignment from '#models/role_assignment'
import UserAccount from '#models/user_account'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class BaseUnitVersion extends BaseUnitVersionSchema {
  @beforeCreate()
  static assignUuid(version: BaseUnitVersion) {
    version.id = randomUUID()
  }

  @belongsTo(() => BaseUnit)
  declare baseUnit: BelongsTo<typeof BaseUnit>

  @belongsTo(() => UserAccount, { foreignKey: 'changedByAccountId' })
  declare changedByAccount: BelongsTo<typeof UserAccount>

  @belongsTo(() => RoleAssignment, { foreignKey: 'authorizationRoleAssignmentId' })
  declare authorizationRoleAssignment: BelongsTo<typeof RoleAssignment>

  @belongsTo(() => Delegation, { foreignKey: 'authorizationDelegationId' })
  declare authorizationDelegation: BelongsTo<typeof Delegation>

  @belongsTo(() => OrganizationalUnit, { foreignKey: 'resolvedScopeOrganizationalUnitId' })
  declare resolvedScopeOrganizationalUnit: BelongsTo<typeof OrganizationalUnit>
}
