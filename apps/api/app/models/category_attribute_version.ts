import { randomUUID } from 'node:crypto'
import { beforeCreate, belongsTo } from '@adonisjs/lucid/orm'
import { CategoryAttributeVersionSchema } from '#database/schema'
import CatalogueCategory from '#models/catalogue_category'
import CategoryAttribute from '#models/category_attribute'
import Delegation from '#models/delegation'
import OrganizationalUnit from '#models/organizational_unit'
import RoleAssignment from '#models/role_assignment'
import UserAccount from '#models/user_account'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class CategoryAttributeVersion extends CategoryAttributeVersionSchema {
  @beforeCreate()
  static assignUuid(version: CategoryAttributeVersion) {
    version.id = randomUUID()
  }

  @belongsTo(() => CategoryAttribute)
  declare categoryAttribute: BelongsTo<typeof CategoryAttribute>

  @belongsTo(() => CatalogueCategory)
  declare catalogueCategory: BelongsTo<typeof CatalogueCategory>

  @belongsTo(() => UserAccount, { foreignKey: 'changedByAccountId' })
  declare changedByAccount: BelongsTo<typeof UserAccount>

  @belongsTo(() => RoleAssignment, { foreignKey: 'authorizationRoleAssignmentId' })
  declare authorizationRoleAssignment: BelongsTo<typeof RoleAssignment>

  @belongsTo(() => Delegation, { foreignKey: 'authorizationDelegationId' })
  declare authorizationDelegation: BelongsTo<typeof Delegation>

  @belongsTo(() => OrganizationalUnit, { foreignKey: 'resolvedScopeOrganizationalUnitId' })
  declare resolvedScopeOrganizationalUnit: BelongsTo<typeof OrganizationalUnit>
}
