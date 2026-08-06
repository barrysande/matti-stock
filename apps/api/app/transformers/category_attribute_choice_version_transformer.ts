import { BaseTransformer } from '@adonisjs/core/transformers'
import type CategoryAttributeChoiceVersion from '#models/category_attribute_choice_version'

export default class CategoryAttributeChoiceVersionTransformer extends BaseTransformer<CategoryAttributeChoiceVersion> {
  toObject() {
    return {
      id: this.resource.id,
      version: Number(this.resource.version),
      changeKind: this.resource.changeKind,
      label: this.resource.label,
      displayOrder: this.resource.displayOrder,
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
