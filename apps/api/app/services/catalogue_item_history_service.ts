import type { DateTime } from 'luxon'
import CatalogueItemAttributeValue from '#models/catalogue_item_attribute_value'
import CatalogueItemKeyword from '#models/catalogue_item_keyword'
import CatalogueItemVersion from '#models/catalogue_item_version'
import CatalogueItemVersionAttributeValue from '#models/catalogue_item_version_attribute_value'
import CatalogueItemVersionKeyword from '#models/catalogue_item_version_keyword'
import type CatalogueItem from '#models/catalogue_item'
import type { CatalogueAuthorization, CatalogueItemChangeKind } from '#types/catalogue'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export default class CatalogueItemHistoryService {
  private lockCurrentVersion(trx: TransactionClientContract, itemId: string) {
    return CatalogueItemVersion.query({ client: trx })
      .where('catalogue_item_id', itemId)
      .whereNull('effective_to')
      .forUpdate()
      .firstOrFail()
  }

  private nextEffectiveTime(current: CatalogueItemVersion, proposed: DateTime<true>) {
    return proposed <= current.effectiveFrom
      ? (current.effectiveFrom.plus({ milliseconds: 1 }) as DateTime<true>)
      : proposed
  }

  private snapshot(
    item: CatalogueItem,
    changeKind: CatalogueItemChangeKind,
    reason: string,
    actorAccountId: string,
    authorization: CatalogueAuthorization,
    effectiveFrom: DateTime<true>,
    version: number
  ) {
    return {
      catalogueItemId: item.id,
      version,
      changeKind,
      catalogueCode: item.catalogueCode,
      name: item.name,
      normalizedName: item.normalizedName,
      description: item.description,
      catalogueCategoryId: item.catalogueCategoryId,
      stockType: item.stockType,
      trackingMethod: item.trackingMethod,
      baseUnitId: item.baseUnitId,
      identificationStatus: item.identificationStatus,
      inventorySemanticsLockedAt: item.inventorySemanticsLockedAt,
      archivedAt: item.archivedAt,
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

  private async snapshotChildren(
    itemId: string,
    versionId: string,
    trx: TransactionClientContract
  ) {
    const keywords = await CatalogueItemKeyword.query({ client: trx })
      .where('catalogue_item_id', itemId)
      .orderBy('display_order', 'asc')

    for (const keyword of keywords) {
      await CatalogueItemVersionKeyword.create(
        {
          catalogueItemVersionId: versionId,
          keyword: keyword.keyword,
          normalizedKeyword: keyword.normalizedKeyword,
          displayOrder: keyword.displayOrder,
        },
        { client: trx }
      )
    }

    const values = await CatalogueItemAttributeValue.query({ client: trx })
      .where('catalogue_item_id', itemId)
      .preload('categoryAttribute')
      .preload('choice')
      .orderBy('category_attribute_id', 'asc')

    for (const value of values) {
      await CatalogueItemVersionAttributeValue.create(
        {
          catalogueItemVersionId: versionId,
          categoryAttributeId: value.categoryAttributeId,
          attributeName: value.categoryAttribute.name,
          dataType: value.dataType,
          textValue: value.textValue,
          numberValue: value.numberValue,
          dateValue: value.dateValue,
          yesNoValue: value.yesNoValue,
          choiceId: value.choiceId,
          choiceLabel: value.choice?.label ?? null,
        },
        { client: trx }
      )
    }
  }

  async createInitialVersion(
    item: CatalogueItem,
    reason: string,
    actorAccountId: string,
    authorization: CatalogueAuthorization,
    trx: TransactionClientContract,
    effectiveFrom: DateTime<true>
  ) {
    const version = await CatalogueItemVersion.create(
      this.snapshot(item, 'CREATED', reason, actorAccountId, authorization, effectiveFrom, 1),
      { client: trx }
    )

    await this.snapshotChildren(item.id, version.id, trx)

    return version
  }

  async appendVersion(
    item: CatalogueItem,
    changeKind: Exclude<CatalogueItemChangeKind, 'CREATED'>,
    reason: string,
    actorAccountId: string,
    authorization: CatalogueAuthorization,
    trx: TransactionClientContract,
    proposedNow: DateTime<true>
  ) {
    const current = await this.lockCurrentVersion(trx, item.id)

    const effectiveFrom = this.nextEffectiveTime(current, proposedNow)

    await current.merge({ effectiveTo: effectiveFrom }).save()

    const version = await CatalogueItemVersion.create(
      this.snapshot(
        item,
        changeKind,
        reason,
        actorAccountId,
        authorization,
        effectiveFrom,
        Number(current.version) + 1
      ),
      { client: trx }
    )

    await this.snapshotChildren(item.id, version.id, trx)

    return version
  }
}
