import type { DateTime } from 'luxon'
import type CategoryAttribute from '#models/category_attribute'
import CategoryAttributeVersion from '#models/category_attribute_version'
import type { CatalogueAuthorization, CategoryAttributeChangeKind } from '#types/catalogue'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export default class CategoryAttributeHistoryService {
  private lockCurrentVersion(trx: TransactionClientContract, attributeId: string) {
    return CategoryAttributeVersion.query({ client: trx })
      .where('category_attribute_id', attributeId)
      .whereNull('effective_to')
      .forUpdate()
      .firstOrFail()
  }

  private nextEffectiveTime(current: CategoryAttributeVersion, proposed: DateTime<true>) {
    return proposed <= current.effectiveFrom
      ? (current.effectiveFrom.plus({ milliseconds: 1 }) as DateTime<true>)
      : proposed
  }

  private snapshot(
    attribute: CategoryAttribute,
    changeKind: CategoryAttributeChangeKind,
    reason: string,
    actorAccountId: string,
    authorization: CatalogueAuthorization,
    effectiveFrom: DateTime<true>,
    version: number
  ) {
    return {
      categoryAttributeId: attribute.id,
      version,
      changeKind,
      catalogueCategoryId: attribute.catalogueCategoryId,
      name: attribute.name,
      description: attribute.description,
      dataType: attribute.dataType,
      isRequired: attribute.isRequired,
      scope: attribute.scope,
      archivedAt: attribute.archivedAt,
      effectiveFrom,
      effectiveTo: null,
      changedByAccountId: actorAccountId,
      authorizationRoleAssignmentId: authorization.grant.assignmentId,
      authorizationDelegationId: authorization.grant.delegationId,
      permissionKey: authorization.grant.permissionKey,
      resolvedScopeOrganizationalUnitId: authorization.instituteOrganizationalUnitId,
      reason,
    }
  }

  createInitialVersion(
    attribute: CategoryAttribute,
    reason: string,
    actorAccountId: string,
    authorization: CatalogueAuthorization,
    trx: TransactionClientContract,
    effectiveFrom: DateTime<true>
  ) {
    return CategoryAttributeVersion.create(
      this.snapshot(attribute, 'CREATED', reason, actorAccountId, authorization, effectiveFrom, 1),
      { client: trx }
    )
  }

  async appendVersion(
    attribute: CategoryAttribute,
    changeKind: Exclude<CategoryAttributeChangeKind, 'CREATED'>,
    reason: string,
    actorAccountId: string,
    authorization: CatalogueAuthorization,
    trx: TransactionClientContract,
    proposedNow: DateTime<true>
  ) {
    const current = await this.lockCurrentVersion(trx, attribute.id)
    const effectiveFrom = this.nextEffectiveTime(current, proposedNow)
    await current.merge({ effectiveTo: effectiveFrom }).save()

    return CategoryAttributeVersion.create(
      this.snapshot(
        attribute,
        changeKind,
        reason,
        actorAccountId,
        authorization,
        effectiveFrom,
        Number(current.version) + 1
      ),
      { client: trx }
    )
  }
}
