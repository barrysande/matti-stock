import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import InvalidCatalogueCategoryMergeException from '#exceptions/invalid_catalogue_category_merge_exception'
import StaleCatalogueCategoryMergePreviewException from '#exceptions/stale_catalogue_category_merge_preview_exception'
import CatalogueItem from '#models/catalogue_item'
import CatalogueAuthorityService from '#services/catalogue_authority_service'
import CatalogueCategoryHierarchyService from '#services/catalogue_category_hierarchy_service'
import CatalogueCategoryHistoryService from '#services/catalogue_category_history_service'
import CatalogueCategoryMergePreviewService from '#services/catalogue_category_merge_preview_service'
import CatalogueItemHistoryService from '#services/catalogue_item_history_service'
import CatalogueItemSimilarityService from '#services/catalogue_item_similarity_service'
import type { mergeCatalogueCategoryValidator } from '#validators/catalogue_category'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { Infer } from '@vinejs/vine/types'

type MergeData = Infer<typeof mergeCatalogueCategoryValidator>

@inject()
export default class CatalogueCategoryMergeService {
  constructor(
    private authority: CatalogueAuthorityService,
    private hierarchy: CatalogueCategoryHierarchyService,
    private categoryHistory: CatalogueCategoryHistoryService,
    private itemHistory: CatalogueItemHistoryService,
    private previewService: CatalogueCategoryMergePreviewService,
    private similarity: CatalogueItemSimilarityService
  ) {}

  private invalid(message: string): never {
    throw new InvalidCatalogueCategoryMergeException(message)
  }

  private lockRelevantItems(sourceId: string, targetId: string, trx: TransactionClientContract) {
    return CatalogueItem.query({ client: trx })
      .whereIn('catalogue_category_id', [sourceId, targetId])
      .orderBy('id', 'asc')
      .forUpdate()
  }

  private mergeWithinLock(sourceId: string, data: MergeData, actorAccountId: string) {
    return db.transaction(async (trx) => {
      const now = DateTime.now()
      const authorization = await this.authority.authorizeMutation(trx, actorAccountId, now)

      const items = await this.lockRelevantItems(sourceId, data.targetCategoryId, trx)
      const categories = await this.hierarchy.lock(trx)
      const source = categories.find((category) => category.id === sourceId)
      const target = categories.find((category) => category.id === data.targetCategoryId)

      if (!source || !target) {
        await this.previewService.preview(sourceId, data.targetCategoryId, trx)
        throw new Error('Unreachable missing merge category')
      }

      this.hierarchy.assertMergeTarget(source, target, categories)

      const preview = await this.previewService.preview(source.id, target.id, trx)

      if (preview.fingerprint !== data.previewFingerprint) {
        throw new StaleCatalogueCategoryMergePreviewException()
      }

      if (!preview.ready) {
        this.invalid(
          'Move, merge, or archive active child categories before merging this category.'
        )
      }

      for (const item of items.filter((candidate) => candidate.catalogueCategoryId === source.id)) {
        await item.merge({ catalogueCategoryId: target.id }).save()

        await this.itemHistory.appendVersion(
          item,
          'CATEGORY_MERGED',
          data.reason,
          actorAccountId,
          authorization,
          trx,
          now
        )
      }

      await source.merge({ archivedAt: now, mergedIntoCategoryId: target.id }).save()

      await this.categoryHistory.appendVersion(
        source,
        'MERGED',
        data.reason,
        actorAccountId,
        authorization,
        trx,
        now
      )
    })
  }

  merge(sourceId: string, data: MergeData, actorAccountId: string) {
    return this.similarity.runMutation(() => this.mergeWithinLock(sourceId, data, actorAccountId))
  }
}
