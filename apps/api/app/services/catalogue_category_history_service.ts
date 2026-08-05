import type { DateTime } from 'luxon'
import type CatalogueCategory from '#models/catalogue_category'
import CatalogueCategoryVersion from '#models/catalogue_category_version'
import type { CatalogueAuthorization, CatalogueCategoryChangeKind } from '#types/catalogue'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export default class CatalogueCategoryHistoryService {
  private lockCurrentVersion(trx: TransactionClientContract, categoryId: string) {
    return CatalogueCategoryVersion.query({ client: trx })
      .where('catalogue_category_id', categoryId)
      .whereNull('effective_to')
      .forUpdate()
      .firstOrFail()
  }

  private nextEffectiveTime(
    current: CatalogueCategoryVersion,
    proposed: DateTime<true>
  ): DateTime<true> {
    return proposed <= current.effectiveFrom
      ? (current.effectiveFrom.plus({ milliseconds: 1 }) as DateTime<true>)
      : proposed
  }

  private snapshot(
    category: CatalogueCategory,
    changeKind: CatalogueCategoryChangeKind,
    reason: string,
    actorAccountId: string,
    authorization: CatalogueAuthorization,
    effectiveFrom: DateTime<true>,
    version: number
  ) {
    return {
      catalogueCategoryId: category.id,
      version,
      changeKind,
      name: category.name,
      description: category.description,
      parentId: category.parentId,
      archivedAt: category.archivedAt,
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

  /** Records the first effective category snapshot with its exact authorization context. */
  createInitialVersion(
    category: CatalogueCategory,
    reason: string,
    actorAccountId: string,
    authorization: CatalogueAuthorization,
    trx: TransactionClientContract,
    effectiveFrom: DateTime<true>
  ) {
    return CatalogueCategoryVersion.create(
      this.snapshot(category, 'CREATED', reason, actorAccountId, authorization, effectiveFrom, 1),
      { client: trx }
    )
  }

  /** Closes the current category snapshot and appends its next effective version. */
  async appendVersion(
    category: CatalogueCategory,
    changeKind: Exclude<CatalogueCategoryChangeKind, 'CREATED'>,
    reason: string,
    actorAccountId: string,
    authorization: CatalogueAuthorization,
    trx: TransactionClientContract,
    proposedNow: DateTime<true>
  ) {
    const current = await this.lockCurrentVersion(trx, category.id)
    const effectiveFrom = this.nextEffectiveTime(current, proposedNow)

    await current.merge({ effectiveTo: effectiveFrom }).save()

    return CatalogueCategoryVersion.create(
      this.snapshot(
        category,
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
