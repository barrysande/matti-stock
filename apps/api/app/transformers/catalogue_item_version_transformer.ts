import { BaseTransformer } from '@adonisjs/core/transformers'
import type CatalogueItemVersion from '#models/catalogue_item_version'

export default class CatalogueItemVersionTransformer extends BaseTransformer<CatalogueItemVersion> {
  toObject() {
    return {
      version: Number(this.resource.version),
      changeKind: this.resource.changeKind,
      catalogueCode: this.resource.catalogueCode,
      name: this.resource.name,
      description: this.resource.description,
      keywords: this.resource.keywords.map(({ keyword }) => keyword),
      category: {
        id: this.resource.catalogueCategoryId,
        name: this.resource.catalogueCategory.name,
      },
      stockType: this.resource.stockType,
      trackingMethod: this.resource.trackingMethod,
      baseUnit: {
        id: this.resource.baseUnitId,
        name: this.resource.baseUnit.name,
        symbol: this.resource.baseUnit.symbol,
      },
      identificationStatus: this.resource.identificationStatus,
      inventorySemanticsLockedAt: this.resource.inventorySemanticsLockedAt,
      archivedAt: this.resource.archivedAt,
      reviewedCandidates: this.resource.reviewedCandidates.map((candidate) => ({
        catalogueCode: candidate.candidateCatalogueItem.catalogueCode,
        name: candidate.candidateCatalogueItem.name,
        primaryMatchKind: candidate.primaryMatchKind,
        confirmationReason: candidate.confirmationReason,
      })),
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
