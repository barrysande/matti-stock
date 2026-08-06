import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import DuplicateException from '#exceptions/duplicate_exception'
import InvalidCatalogueItemChangeException from '#exceptions/invalid_catalogue_item_change_exception'
import BaseUnit from '#models/base_unit'
import CatalogueCategory from '#models/catalogue_category'
import CatalogueItem from '#models/catalogue_item'
import CatalogueAuthorityService from '#services/catalogue_authority_service'
import CatalogueItemAttributeValueService from '#services/catalogue_item_attribute_value_service'
import CatalogueItemHistoryService from '#services/catalogue_item_history_service'
import CatalogueItemKeywordService from '#services/catalogue_item_keyword_service'
import CatalogueItemSimilarityService from '#services/catalogue_item_similarity_service'
import {
  catalogueItemNameKey,
  normalizeCatalogueItemKeywords,
  normalizeCatalogueItemName,
  resolveCatalogueItemDescription,
} from '#utils/catalogue_item'
import type { createCatalogueItemValidator } from '#validators/catalogue_item'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { Infer } from '@vinejs/vine/types'

const NAME_DUPLICATE_CONSTRAINTS = ['catalogue_items_normalized_name_unique'] as const
type CreateData = Infer<typeof createCatalogueItemValidator>

@inject()
export default class CatalogueItemProvisioningService {
  constructor(
    private authority: CatalogueAuthorityService,
    private attributeValues: CatalogueItemAttributeValueService,
    private history: CatalogueItemHistoryService,
    private keywords: CatalogueItemKeywordService,
    private similarity: CatalogueItemSimilarityService
  ) {}

  private invalid(message: string): never {
    throw new InvalidCatalogueItemChangeException(message)
  }

  private async lockActiveCategory(categoryId: string, trx: TransactionClientContract) {
    const category = await CatalogueCategory.query({ client: trx })
      .where('id', categoryId)
      .forUpdate()
      .firstOrFail()
    if (category.archivedAt) this.invalid('The selected catalogue category is archived.')
    return category
  }

  private async lockActiveBaseUnit(baseUnitId: string, trx: TransactionClientContract) {
    const unit = await BaseUnit.query({ client: trx })
      .where('id', baseUnitId)
      .forUpdate()
      .firstOrFail()
    if (unit.archivedAt) this.invalid('The selected base unit is archived.')
    return unit
  }

  private sequenceExhausted(error: unknown) {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === '2200H'
  }

  private async createWithinLock(data: CreateData, actorAccountId: string) {
    if (data.trackingMethodConfirmed !== true) {
      this.invalid('The tracking method must be explicitly confirmed.')
    }

    let normalizedKeywords

    try {
      normalizedKeywords = normalizeCatalogueItemKeywords(data.keywords)
    } catch (error) {
      this.invalid(error instanceof Error ? error.message : 'Catalogue item keywords are invalid.')
    }

    try {
      return await db.transaction(async (trx) => {
        const now = DateTime.now()
        const authorization = await this.authority.authorizeMutation(trx, actorAccountId, now)
        const preparedValues = await this.attributeValues.prepareReplacement(
          data.catalogueCategoryId,
          data.attributeValues,
          trx,
          now
        )
        await this.lockActiveCategory(data.catalogueCategoryId, trx)
        await this.attributeValues.assertApplicableSetUnchanged(
          data.catalogueCategoryId,
          preparedValues.attributeIds,
          trx
        )
        const baseUnit = await this.lockActiveBaseUnit(data.baseUnitId, trx)
        const candidates = await this.similarity.assertReviewed(data, trx)

        const createdItem = await CatalogueItem.create(
          {
            name: normalizeCatalogueItemName(data.name),
            normalizedName: catalogueItemNameKey(data.name),
            description: resolveCatalogueItemDescription(data.description),
            catalogueCategoryId: data.catalogueCategoryId,
            stockType: data.stockType,
            trackingMethod: data.trackingMethod,
            baseUnitId: data.baseUnitId,
            identificationStatus: data.identificationStatus,
            inventorySemanticsLockedAt: null,
            archivedAt: null,
          },
          { client: trx }
        )
        const item = await CatalogueItem.query({ client: trx })
          .where('id', createdItem.id)
          .firstOrFail()

        await baseUnit.merge({ firstUsedAt: baseUnit.firstUsedAt ?? now }).save()

        await this.keywords.replace(item.id, normalizedKeywords, trx)
        await this.attributeValues.replaceCurrent(item.id, preparedValues.values, trx)

        const version = await this.history.createInitialVersion(
          item,
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
    } catch (error) {
      if (DuplicateException.is(error, NAME_DUPLICATE_CONSTRAINTS)) {
        throw new DuplicateException('A catalogue item already uses this normalized name.')
      }

      if (this.sequenceExhausted(error)) {
        this.invalid('The permanent catalogue-code sequence has reached ITEM-999999.')
      }

      throw error
    }
  }

  create(data: CreateData, actorAccountId: string) {
    return this.similarity.runMutation(() => this.createWithinLock(data, actorAccountId))
  }
}
