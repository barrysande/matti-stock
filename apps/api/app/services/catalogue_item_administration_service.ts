import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import DuplicateException from '#exceptions/duplicate_exception'
import InvalidCatalogueItemChangeException from '#exceptions/invalid_catalogue_item_change_exception'
import BaseUnit from '#models/base_unit'
import CatalogueCategory from '#models/catalogue_category'
import CatalogueItem from '#models/catalogue_item'
import CatalogueAuthorityService from '#services/catalogue_authority_service'
import CatalogueItemHistoryService from '#services/catalogue_item_history_service'
import CatalogueItemKeywordService from '#services/catalogue_item_keyword_service'
import CatalogueItemSimilarityService, {
  type CatalogueSimilarityCandidate,
} from '#services/catalogue_item_similarity_service'
import {
  catalogueItemNameKey,
  normalizeCatalogueItemKeywords,
  normalizeCatalogueItemName,
  resolveCatalogueItemDescription,
} from '#utils/catalogue_item'
import type {
  administerCatalogueItemValidator,
  restoreCatalogueItemValidator,
  updateCatalogueItemDetailsValidator,
} from '#validators/catalogue_item'
import type { CatalogueItemStockType } from '#types/catalogue'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { Infer } from '@vinejs/vine/types'

const NAME_DUPLICATE_CONSTRAINTS = ['catalogue_items_normalized_name_unique'] as const
type DetailsData = Infer<typeof updateCatalogueItemDetailsValidator>
type AdministerData = Infer<typeof administerCatalogueItemValidator>
type RestoreData = Infer<typeof restoreCatalogueItemValidator>

@inject()
export default class CatalogueItemAdministrationService {
  constructor(
    private authority: CatalogueAuthorityService,
    private history: CatalogueItemHistoryService,
    private keywords: CatalogueItemKeywordService,
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

  private assertActive(item: CatalogueItem) {
    if (item.archivedAt) {
      this.invalid('An archived catalogue item must be restored before it can be changed.')
    }
  }

  private async keywordsFor(itemId: string, trx: TransactionClientContract) {
    const rows = await db
      .from('catalogue_item_keywords')
      .useTransaction(trx)
      .where('catalogue_item_id', itemId)
      .orderBy('display_order', 'asc')

    return rows.map((row) => ({
      keyword: String(row.keyword),
      normalizedKeyword: String(row.normalized_keyword),
    }))
  }

  private async updateDetailsWithinLock(
    catalogueCode: string,
    data: DetailsData,
    actorAccountId: string
  ) {
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

        const item = await this.lockItem(trx, catalogueCode)

        this.assertActive(item)

        const existingKeywords = await this.keywordsFor(item.id, trx)
        const name = normalizeCatalogueItemName(data.name)
        const normalizedName = catalogueItemNameKey(data.name)
        const description = resolveCatalogueItemDescription(data.description)
        const identityChanged =
          normalizedName !== item.normalizedName ||
          normalizedKeywords.map(({ normalizedKeyword }) => normalizedKeyword).join(':') !==
            existingKeywords.map(({ normalizedKeyword }) => normalizedKeyword).join(':')

        let candidates: CatalogueSimilarityCandidate[] = []

        if (identityChanged) {
          if (!data.reviewFingerprint) {
            this.invalid('Review similar catalogue items before changing the name or keywords.')
          }

          candidates = await this.similarity.assertReviewed(
            {
              name,
              keywords: data.keywords,
              catalogueCategoryId: item.catalogueCategoryId,
              stockType: item.stockType as CatalogueItemStockType,
              reviewFingerprint: data.reviewFingerprint,
              confirmedNotInterchangeable: data.confirmedNotInterchangeable,
              similarityReason: data.similarityReason,
            },
            trx,
            item.catalogueCode
          )
        }

        if (
          item.name === name &&
          item.description === description &&
          item.identificationStatus === data.identificationStatus &&
          !identityChanged
        ) {
          this.invalid('The catalogue item already has these details.')
        }

        await item
          .merge({
            name,
            normalizedName,
            description,
            identificationStatus: data.identificationStatus,
          })
          .save()

        await this.keywords.replace(item.id, normalizedKeywords, trx)

        const version = await this.history.appendVersion(
          item,
          'DETAILS_UPDATED',
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
      DuplicateException.throwIf(
        error,
        'A catalogue item already uses this normalized name.',
        NAME_DUPLICATE_CONSTRAINTS
      )

      throw error
    }
  }

  updateDetails(catalogueCode: string, data: DetailsData, actorAccountId: string) {
    return this.similarity.runMutation(() =>
      this.updateDetailsWithinLock(catalogueCode, data, actorAccountId)
    )
  }

  archive(catalogueCode: string, data: AdministerData, actorAccountId: string) {
    return this.similarity.runMutation(() =>
      db.transaction(async (trx) => {
        const now = DateTime.now()
        const authorization = await this.authority.authorizeMutation(trx, actorAccountId, now)

        const item = await this.lockItem(trx, catalogueCode)

        this.assertActive(item)

        await item.merge({ archivedAt: now }).save()

        await this.history.appendVersion(
          item,
          'ARCHIVED',
          data.reason,
          actorAccountId,
          authorization,
          trx,
          now
        )
      })
    )
  }

  restore(catalogueCode: string, data: RestoreData, actorAccountId: string) {
    return this.similarity.runMutation(() =>
      db.transaction(async (trx) => {
        const now = DateTime.now()
        const authorization = await this.authority.authorizeMutation(trx, actorAccountId, now)

        const item = await this.lockItem(trx, catalogueCode)

        if (!item.archivedAt) {
          this.invalid('The catalogue item is not archived.')
        }

        const category = await CatalogueCategory.query({ client: trx })
          .where('id', item.catalogueCategoryId)
          .forUpdate()
          .firstOrFail()

        const baseUnit = await BaseUnit.query({ client: trx })
          .where('id', item.baseUnitId)
          .forUpdate()
          .firstOrFail()

        if (category.archivedAt || baseUnit.archivedAt) {
          this.invalid('Restore the catalogue category and base unit before restoring this item.')
        }

        const existingKeywords = await this.keywordsFor(item.id, trx)
        const candidates = await this.similarity.assertReviewed(
          {
            name: item.name,
            keywords: existingKeywords.map(({ keyword }) => keyword),
            catalogueCategoryId: item.catalogueCategoryId,
            stockType: item.stockType as CatalogueItemStockType,
            reviewFingerprint: data.reviewFingerprint,
            confirmedNotInterchangeable: data.confirmedNotInterchangeable,
            similarityReason: data.similarityReason,
          },
          trx,
          item.catalogueCode
        )

        await item.merge({ archivedAt: null }).save()

        const version = await this.history.appendVersion(
          item,
          'RESTORED',
          data.reason,
          actorAccountId,
          authorization,
          trx,
          now
        )

        if (candidates.length) {
          await this.similarity.recordReview(version.id, candidates, data.similarityReason!, trx)
        }
      })
    )
  }
}
