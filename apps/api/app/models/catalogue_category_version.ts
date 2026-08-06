import { randomUUID } from 'node:crypto'
import { beforeCreate, belongsTo } from '@adonisjs/lucid/orm'
import { CatalogueCategoryVersionSchema } from '#database/schema'
import CatalogueCategory from '#models/catalogue_category'
import Delegation from '#models/delegation'
import OrganizationalUnit from '#models/organizational_unit'
import RoleAssignment from '#models/role_assignment'
import UserAccount from '#models/user_account'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class CatalogueCategoryVersion extends CatalogueCategoryVersionSchema {
  @beforeCreate()
  static assignUuid(version: CatalogueCategoryVersion) {
    version.id = randomUUID()
  }

  @belongsTo(() => CatalogueCategory)
  declare catalogueCategory: BelongsTo<typeof CatalogueCategory>

  @belongsTo(() => CatalogueCategory, { foreignKey: 'parentId' })
  declare parent: BelongsTo<typeof CatalogueCategory>

  @belongsTo(() => CatalogueCategory, { foreignKey: 'mergedIntoCategoryId' })
  declare mergedIntoCategory: BelongsTo<typeof CatalogueCategory>

  @belongsTo(() => UserAccount, { foreignKey: 'changedByAccountId' })
  declare changedByAccount: BelongsTo<typeof UserAccount>

  @belongsTo(() => RoleAssignment, { foreignKey: 'authorizationRoleAssignmentId' })
  declare authorizationRoleAssignment: BelongsTo<typeof RoleAssignment>

  @belongsTo(() => Delegation, { foreignKey: 'authorizationDelegationId' })
  declare authorizationDelegation: BelongsTo<typeof Delegation>

  @belongsTo(() => OrganizationalUnit, { foreignKey: 'resolvedScopeOrganizationalUnitId' })
  declare resolvedScopeOrganizationalUnit: BelongsTo<typeof OrganizationalUnit>
}
