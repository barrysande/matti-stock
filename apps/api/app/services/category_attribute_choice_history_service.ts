import type { DateTime } from 'luxon'
import type CategoryAttributeChoice from '#models/category_attribute_choice'
import CategoryAttributeChoiceVersion from '#models/category_attribute_choice_version'
import type { CatalogueAuthorization, CategoryAttributeChoiceChangeKind } from '#types/catalogue'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export default class CategoryAttributeChoiceHistoryService {
  private lockCurrentVersion(trx: TransactionClientContract, choiceId: string) {
    return CategoryAttributeChoiceVersion.query({ client: trx })
      .where('category_attribute_choice_id', choiceId)
      .whereNull('effective_to')
      .forUpdate()
      .firstOrFail()
  }

  private nextEffectiveTime(current: CategoryAttributeChoiceVersion, proposed: DateTime<true>) {
    return proposed <= current.effectiveFrom
      ? (current.effectiveFrom.plus({ milliseconds: 1 }) as DateTime<true>)
      : proposed
  }

  private snapshot(
    choice: CategoryAttributeChoice,
    changeKind: CategoryAttributeChoiceChangeKind,
    reason: string,
    actorAccountId: string,
    authorization: CatalogueAuthorization,
    effectiveFrom: DateTime<true>,
    version: number
  ) {
    return {
      categoryAttributeChoiceId: choice.id,
      version,
      changeKind,
      label: choice.label,
      displayOrder: choice.displayOrder,
      archivedAt: choice.archivedAt,
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
    choice: CategoryAttributeChoice,
    reason: string,
    actorAccountId: string,
    authorization: CatalogueAuthorization,
    trx: TransactionClientContract,
    effectiveFrom: DateTime<true>
  ) {
    return CategoryAttributeChoiceVersion.create(
      this.snapshot(choice, 'CREATED', reason, actorAccountId, authorization, effectiveFrom, 1),
      { client: trx }
    )
  }

  async appendVersion(
    choice: CategoryAttributeChoice,
    changeKind: Exclude<CategoryAttributeChoiceChangeKind, 'CREATED'>,
    reason: string,
    actorAccountId: string,
    authorization: CatalogueAuthorization,
    trx: TransactionClientContract,
    proposedNow: DateTime<true>
  ) {
    const current = await this.lockCurrentVersion(trx, choice.id)
    const effectiveFrom = this.nextEffectiveTime(current, proposedNow)
    await current.merge({ effectiveTo: effectiveFrom }).save()

    return CategoryAttributeChoiceVersion.create(
      this.snapshot(
        choice,
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
