import { BaseTransformer } from '@adonisjs/core/transformers'
import type CategoryAttributeVersion from '#models/category_attribute_version'

export default class CategoryAttributeVersionTransformer extends BaseTransformer<CategoryAttributeVersion> {
  toObject() {
    return {
      id: this.resource.id,
      version: Number(this.resource.version),
      changeKind: this.resource.changeKind,
      category: {
        id: this.resource.catalogueCategoryId,
        name: this.resource.catalogueCategory.name,
      },
      name: this.resource.name,
      description: this.resource.description,
      dataType: this.resource.dataType,
      isRequired: this.resource.isRequired,
      scope: this.resource.scope,
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
