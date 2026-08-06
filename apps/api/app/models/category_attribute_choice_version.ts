import { randomUUID } from 'node:crypto'
import { beforeCreate, belongsTo } from '@adonisjs/lucid/orm'
import { CategoryAttributeChoiceVersionSchema } from '#database/schema'
import CategoryAttributeChoice from '#models/category_attribute_choice'
import Delegation from '#models/delegation'
import OrganizationalUnit from '#models/organizational_unit'
import RoleAssignment from '#models/role_assignment'
import UserAccount from '#models/user_account'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class CategoryAttributeChoiceVersion extends CategoryAttributeChoiceVersionSchema {
  @beforeCreate()
  static assignUuid(version: CategoryAttributeChoiceVersion) {
    version.id = randomUUID()
  }

  @belongsTo(() => CategoryAttributeChoice)
  declare categoryAttributeChoice: BelongsTo<typeof CategoryAttributeChoice>

  @belongsTo(() => UserAccount, { foreignKey: 'changedByAccountId' })
  declare changedByAccount: BelongsTo<typeof UserAccount>

  @belongsTo(() => RoleAssignment, { foreignKey: 'authorizationRoleAssignmentId' })
  declare authorizationRoleAssignment: BelongsTo<typeof RoleAssignment>

  @belongsTo(() => Delegation, { foreignKey: 'authorizationDelegationId' })
  declare authorizationDelegation: BelongsTo<typeof Delegation>

  @belongsTo(() => OrganizationalUnit, { foreignKey: 'resolvedScopeOrganizationalUnitId' })
  declare resolvedScopeOrganizationalUnit: BelongsTo<typeof OrganizationalUnit>
}
