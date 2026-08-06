import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import CatalogueItemSemanticsLockedException from '#exceptions/catalogue_item_semantics_locked_exception'
import InvalidCatalogueItemChangeException from '#exceptions/invalid_catalogue_item_change_exception'
import BaseUnit from '#models/base_unit'
import CatalogueCategory from '#models/catalogue_category'
import CatalogueItem from '#models/catalogue_item'
import CatalogueItemKeyword from '#models/catalogue_item_keyword'
import CatalogueAuthorityService from '#services/catalogue_authority_service'
import CatalogueItemAttributeValueService from '#services/catalogue_item_attribute_value_service'
import CatalogueItemHistoryService from '#services/catalogue_item_history_service'
import CatalogueItemSimilarityService, {
  type CatalogueSimilarityCandidate,
} from '#services/catalogue_item_similarity_service'
import type { updateCatalogueItemClassificationValidator } from '#validators/catalogue_item'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { Infer } from '@vinejs/vine/types'

type ClassificationData = Infer<typeof updateCatalogueItemClassificationValidator>

@inject()
export default class CatalogueItemClassificationService {
  constructor(
    private authority: CatalogueAuthorityService,
    private attributeValues: CatalogueItemAttributeValueService,
    private history: CatalogueItemHistoryService,
    private similarity: CatalogueItemSimilarityService
  ) {}

  private invalid(message: string): never {
    throw new InvalidCatalogueItemChangeException(message)
  }

  private lockItem(trx: TransactionClientContract, catalogueCode: string) {
    return CatalogueItem.query({ client: trx })
      .where('catalogue_code', catalogueCode)
      .forUpdate()
      .firstOrFail()
  }

  private async lockActiveCategory(categoryId: string, trx: TransactionClientContract) {
    const category = await CatalogueCategory.query({ client: trx })
      .where('id', categoryId)
      .forUpdate()
      .firstOrFail()

    if (category.archivedAt) {
      this.invalid('The selected catalogue category is archived.')
    }
  }

  private async lockActiveBaseUnit(baseUnitId: string, trx: TransactionClientContract) {
    const unit = await BaseUnit.query({ client: trx })
      .where('id', baseUnitId)
      .forUpdate()
      .firstOrFail()

    if (unit.archivedAt) {
      this.invalid('The selected base unit is archived.')
    }

    return unit
  }

  private updateWithinLock(
    catalogueCode: string,
    data: ClassificationData,
    actorAccountId: string
  ) {
    return db.transaction(async (trx) => {
      const now = DateTime.now()
      const authorization = await this.authority.authorizeMutation(trx, actorAccountId, now)

      const item = await this.lockItem(trx, catalogueCode)

      if (item.archivedAt) {
        this.invalid('Restore the catalogue item before changing its classification.')
      }

      if (data.trackingMethodConfirmed !== true) {
        this.invalid('The tracking method must be explicitly confirmed.')
      }

      const semanticsChanged =
        item.stockType !== data.stockType ||
        item.trackingMethod !== data.trackingMethod ||
        item.baseUnitId !== data.baseUnitId

      if (item.inventorySemanticsLockedAt && semanticsChanged) {
        throw new CatalogueItemSemanticsLockedException(
          'Stock type, tracking method, and base unit require a controlled conversion after inventory holdings exist.'
        )
      }

      const categoryChanged = item.catalogueCategoryId !== data.catalogueCategoryId

      if (!categoryChanged && !semanticsChanged) {
        this.invalid('The catalogue item already has this classification.')
      }

      if (
        !categoryChanged &&
        (data.attributeValues?.length || data.acknowledgedRemovedAttributeValueIds.length)
      ) {
        this.invalid('Use the attribute-value route when the catalogue category is unchanged.')
      }

      let preparedValues = null
      let candidates: CatalogueSimilarityCandidate[] = []

      if (categoryChanged) {
        preparedValues = await this.attributeValues.prepareReplacement(
          data.catalogueCategoryId,
          data.attributeValues,
          trx,
          now
        )

        const removedIds = await this.attributeValues.currentValueIds(item.id, trx)
        const acknowledged = [...data.acknowledgedRemovedAttributeValueIds].sort()

        if (removedIds.join(':') !== acknowledged.join(':')) {
          this.invalid(
            'Acknowledge the exact current attribute values removed by the category change.'
          )
        }

        if (!data.reviewFingerprint) {
          this.invalid('Review similar catalogue items before changing the category.')
        }

        const keywords = await CatalogueItemKeyword.query({ client: trx })
          .where('catalogue_item_id', item.id)
          .orderBy('display_order', 'asc')

        candidates = await this.similarity.assertReviewed(
          {
            name: item.name,
            keywords: keywords.map(({ keyword }) => keyword),
            catalogueCategoryId: data.catalogueCategoryId,
            stockType: data.stockType,
            reviewFingerprint: data.reviewFingerprint,
            confirmedNotInterchangeable: data.confirmedNotInterchangeable,
            similarityReason: data.similarityReason,
          },
          trx,
          item.catalogueCode
        )
      }

      await this.lockActiveCategory(data.catalogueCategoryId, trx)

      if (preparedValues) {
        await this.attributeValues.assertApplicableSetUnchanged(
          data.catalogueCategoryId,
          preparedValues.attributeIds,
          trx
        )
      }

      const baseUnit = await this.lockActiveBaseUnit(data.baseUnitId, trx)

      await item
        .merge({
          catalogueCategoryId: data.catalogueCategoryId,
          stockType: data.stockType,
          trackingMethod: data.trackingMethod,
          baseUnitId: data.baseUnitId,
        })
        .save()

      await baseUnit.merge({ firstUsedAt: baseUnit.firstUsedAt ?? now }).save()

      if (preparedValues) {
        await this.attributeValues.replaceCurrent(item.id, preparedValues.values, trx)
      }

      const version = await this.history.appendVersion(
        item,
        'CLASSIFICATION_UPDATED',
        data.reason,
        actorAccountId,
        authorization,
        trx,
        now
      )

      if (candidates.length) {
        await this.similarity.recordReview(version.id, candidates, data.similarityReason!, trx)
      }

      return item
    })
  }

  update(catalogueCode: string, data: ClassificationData, actorAccountId: string) {
    return this.similarity.runMutation(() =>
      this.updateWithinLock(catalogueCode, data, actorAccountId)
    )
  }
}
