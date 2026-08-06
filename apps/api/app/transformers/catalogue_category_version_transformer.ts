import { BaseTransformer } from '@adonisjs/core/transformers'
import type CatalogueCategoryVersion from '#models/catalogue_category_version'

export default class CatalogueCategoryVersionTransformer extends BaseTransformer<CatalogueCategoryVersion> {
  toObject() {
    return {
      id: this.resource.id,
      version: Number(this.resource.version),
      changeKind: this.resource.changeKind,
      name: this.resource.name,
      description: this.resource.description,
      parent: this.resource.parentId
        ? {
            id: this.resource.parentId,
            name: this.resource.parent.name,
          }
        : null,
      mergedInto: this.resource.mergedIntoCategoryId
        ? {
            id: this.resource.mergedIntoCategory.id,
            name: this.resource.mergedIntoCategory.name,
          }
        : null,
      archivedAt: this.resource.archivedAt,
      effectiveFrom: this.resource.effectiveFrom,
      effectiveTo: this.resource.effectiveTo,
      reason: this.resource.reason,
      changedBy: {
        accountId: this.resource.changedByAccountId,
        displayName: this.resource.changedByAccount.person.displayName,
      },
      authorization: {
        permissionKey: this.resource.permissionKey,
        roleAssignmentId: this.resource.authorizationRoleAssignmentId,
        delegationId: this.resource.authorizationDelegationId,
        resolvedScope: {
          organizationalUnitId: this.resource.resolvedScopeOrganizationalUnitId,
          name: this.resource.resolvedScopeOrganizationalUnit.name,
        },
      },
    }
  }
}
