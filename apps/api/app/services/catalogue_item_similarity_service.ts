import { inject } from '@adonisjs/core'
import lockManager from '@adonisjs/lock/services/main'
import CatalogueItemMutationBusyException from '#exceptions/catalogue_item_mutation_busy_exception'
import CatalogueItemReviewRequiredException from '#exceptions/catalogue_item_review_required_exception'
import DuplicateException from '#exceptions/duplicate_exception'
import InvalidCatalogueItemChangeException from '#exceptions/invalid_catalogue_item_change_exception'
import CatalogueCategory from '#models/catalogue_category'
import CatalogueItem from '#models/catalogue_item'
import CatalogueItemReviewCandidate from '#models/catalogue_item_review_candidate'
import {
  catalogueItemNameKey,
  catalogueSimilarityFingerprint,
  normalizeCatalogueItemKeywords,
  trackingGuidance,
} from '#utils/catalogue_item'
import type { CatalogueItemMatchKind } from '#types/catalogue'
import type {
  createCatalogueItemValidator,
  reviewCatalogueItemChangeValidator,
  reviewCatalogueItemCreationValidator,
} from '#validators/catalogue_item'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { Infer } from '@vinejs/vine/types'

type ReviewData =
  | Infer<typeof reviewCatalogueItemCreationValidator>
  | Infer<typeof reviewCatalogueItemChangeValidator>
type CreateData = Infer<typeof createCatalogueItemValidator>

export interface CatalogueSimilarityCandidate {
  item: CatalogueItem
  primaryMatchKind: CatalogueItemMatchKind
}

@inject()
export default class CatalogueItemSimilarityService {
  private invalid(message: string): never {
    throw new InvalidCatalogueItemChangeException(message)
  }

  private matchKind(
    proposedName: string,
    proposedKeywords: string[],
    candidate: CatalogueItem
  ): CatalogueItemMatchKind | null {
    const candidateName = candidate.normalizedName
    const candidateKeywords = candidate.keywords.map(({ normalizedKeyword }) => normalizedKeyword)

    const proposedTerms = [proposedName, ...proposedKeywords]
    const candidateTerms = [candidateName, ...candidateKeywords]

    if (candidateName === proposedName) return 'EXACT_NAME'

    if (proposedTerms.some((term) => candidateTerms.includes(term))) {
      return 'KEYWORD'
    }

    if (
      proposedTerms.some((proposed) =>
        candidateTerms.some(
          (candidateTerm) =>
            candidateTerm.startsWith(proposed) || proposed.startsWith(candidateTerm)
        )
      )
    ) {
      return 'PREFIX'
    }

    if (
      proposedTerms.some((proposed) =>
        candidateTerms.some(
          (candidateTerm) => candidateTerm.includes(proposed) || proposed.includes(candidateTerm)
        )
      )
    ) {
      return 'SUBSTRING'
    }

    return null
  }

  private async activeCandidates(
    data: ReviewData,
    excludeCatalogueCode?: string,
    client?: TransactionClientContract
  ) {
    const proposedName = catalogueItemNameKey(data.name)
    const proposedKeywords = normalizeCatalogueItemKeywords(data.keywords).map(
      ({ normalizedKeyword }) => normalizedKeyword
    )
    const query = CatalogueItem.query({ client })
      .whereNull('archived_at')
      .preload('catalogueCategory')
      .preload('keywords', (keywordQuery) => keywordQuery.orderBy('display_order', 'asc'))

    if (excludeCatalogueCode) query.whereNot('catalogue_code', excludeCatalogueCode)

    const items = await query
    const candidates = items.flatMap((item) => {
      const primaryMatchKind = this.matchKind(proposedName, proposedKeywords, item)

      return primaryMatchKind ? [{ item, primaryMatchKind }] : []
    })

    const priority: Record<CatalogueItemMatchKind, number> = {
      EXACT_NAME: 0,
      KEYWORD: 1,
      PREFIX: 2,
      SUBSTRING: 3,
    }

    return candidates
      .sort((left, right) => {
        const kindDifference = priority[left.primaryMatchKind] - priority[right.primaryMatchKind]

        if (kindDifference) {
          return kindDifference
        }

        const leftCategory = left.item.catalogueCategoryId === data.catalogueCategoryId ? 0 : 1
        const rightCategory = right.item.catalogueCategoryId === data.catalogueCategoryId ? 0 : 1

        return leftCategory - rightCategory || left.item.name.localeCompare(right.item.name)
      })
      .slice(0, 10)
  }

  private fingerprint(data: ReviewData, candidates: CatalogueSimilarityCandidate[]) {
    return catalogueSimilarityFingerprint({
      name: data.name,
      keywords: normalizeCatalogueItemKeywords(data.keywords),
      catalogueCategoryId: data.catalogueCategoryId,
      candidates: candidates.map(({ item, primaryMatchKind }) => ({
        catalogueCode: item.catalogueCode,
        primaryMatchKind,
        updatedAt: item.updatedAt.toISO()!,
      })),
    })
  }

  async review(data: ReviewData, excludeCatalogueCode?: string) {
    if (excludeCatalogueCode) {
      await CatalogueItem.findByOrFail('catalogueCode', excludeCatalogueCode)
    }

    const category = await CatalogueCategory.findOrFail(data.catalogueCategoryId)

    if (category.archivedAt) this.invalid('The selected catalogue category is archived.')

    const candidates = await this.activeCandidates(data, excludeCatalogueCode)

    return {
      trackingGuidance: trackingGuidance(data.stockType),
      candidates,
      fingerprint: this.fingerprint(data, candidates),
    }
  }

  async assertReviewed(
    data: Pick<
      CreateData,
      | 'name'
      | 'keywords'
      | 'catalogueCategoryId'
      | 'stockType'
      | 'reviewFingerprint'
      | 'confirmedNotInterchangeable'
      | 'similarityReason'
    >,
    client: TransactionClientContract,
    excludeCatalogueCode?: string
  ) {
    const candidates = await this.activeCandidates(data, excludeCatalogueCode, client)

    if (this.fingerprint(data, candidates) !== data.reviewFingerprint) {
      throw new CatalogueItemReviewRequiredException(
        'Similar catalogue items changed. Review the current candidates before continuing.'
      )
    }

    if (candidates.some(({ primaryMatchKind }) => primaryMatchKind === 'EXACT_NAME')) {
      throw new DuplicateException('A catalogue item already uses this normalized name.')
    }

    if (
      candidates.length &&
      (data.confirmedNotInterchangeable !== true || !data.similarityReason?.trim())
    ) {
      throw new CatalogueItemReviewRequiredException(
        'Confirm and explain why the proposed catalogue item is not interchangeable with the shown candidates.'
      )
    }

    return candidates
  }

  async runMutation<T>(callback: () => Promise<T>) {
    const lock = lockManager.createLock('catalogue-items:similarity-mutations', '15s')
    const [acquired, result] = await lock.runImmediately(callback)

    if (!acquired) {
      throw new CatalogueItemMutationBusyException(
        'Another catalogue-item identity change is in progress. Review and try again.'
      )
    }

    return result as T
  }

  async recordReview(
    catalogueItemVersionId: string,
    candidates: CatalogueSimilarityCandidate[],
    confirmationReason: string,
    client: TransactionClientContract
  ) {
    for (const [index, candidate] of candidates.entries()) {
      await CatalogueItemReviewCandidate.create(
        {
          catalogueItemVersionId,
          candidateCatalogueItemId: candidate.item.id,
          primaryMatchKind: candidate.primaryMatchKind,
          displayOrder: index + 1,
          confirmationReason,
        },
        { client }
      )
    }
  }
}
