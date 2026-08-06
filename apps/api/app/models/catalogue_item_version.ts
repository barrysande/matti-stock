import { randomUUID } from 'node:crypto'
import { beforeCreate, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import { CatalogueItemVersionSchema } from '#database/schema'
import BaseUnit from '#models/base_unit'
import CatalogueCategory from '#models/catalogue_category'
import CatalogueItem from '#models/catalogue_item'
import CatalogueItemVersionAttributeValue from '#models/catalogue_item_version_attribute_value'
import CatalogueItemVersionKeyword from '#models/catalogue_item_version_keyword'
import CatalogueItemReviewCandidate from '#models/catalogue_item_review_candidate'
import Delegation from '#models/delegation'
import OrganizationalUnit from '#models/organizational_unit'
import RoleAssignment from '#models/role_assignment'
import UserAccount from '#models/user_account'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class CatalogueItemVersion extends CatalogueItemVersionSchema {
  @beforeCreate()
  static assignUuid(version: CatalogueItemVersion) {
    version.id = randomUUID()
  }

  @belongsTo(() => CatalogueItem)
  declare catalogueItem: BelongsTo<typeof CatalogueItem>

  @belongsTo(() => CatalogueCategory)
  declare catalogueCategory: BelongsTo<typeof CatalogueCategory>

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

  @hasMany(() => CatalogueItemVersionKeyword)
  declare keywords: HasMany<typeof CatalogueItemVersionKeyword>

  @hasMany(() => CatalogueItemVersionAttributeValue)
  declare attributeValues: HasMany<typeof CatalogueItemVersionAttributeValue>

  @hasMany(() => CatalogueItemReviewCandidate)
  declare reviewedCandidates: HasMany<typeof CatalogueItemReviewCandidate>
}
