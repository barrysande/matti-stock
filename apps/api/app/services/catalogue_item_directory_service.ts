import CatalogueItem from '#models/catalogue_item'
import { catalogueItemNameKey } from '#utils/catalogue_item'
import type { CatalogueItemLookupMatchKind } from '#types/catalogue'
import type {
  indexCatalogueItemsValidator,
  lookupCatalogueItemsValidator,
} from '#validators/catalogue_item'
import type { Infer } from '@vinejs/vine/types'

const ITEMS_PER_PAGE = 25
const LOOKUP_LIMIT = 20

type ListData = Infer<typeof indexCatalogueItemsValidator>
type LookupData = Infer<typeof lookupCatalogueItemsValidator>

export default class CatalogueItemDirectoryService {
  private summaryQuery() {
    return CatalogueItem.query()
      .preload('catalogueCategory')
      .preload('baseUnit')
      .preload('keywords', (keywordQuery) => keywordQuery.orderBy('display_order', 'asc'))
  }

  private detailQuery() {
    return this.summaryQuery().preload('versions', (versionQuery) => {
      versionQuery
        .preload('catalogueCategory')
        .preload('baseUnit')
        .preload('changedByAccount', (accountQuery) => accountQuery.preload('person'))
        .preload('resolvedScopeOrganizationalUnit')
        .preload('keywords', (keywordQuery) => keywordQuery.orderBy('display_order', 'asc'))
        .preload('reviewedCandidates', (candidateQuery) => {
          candidateQuery.preload('candidateCatalogueItem').orderBy('display_order', 'asc')
        })
        .orderBy('version', 'desc')
    })
  }

  list(data: ListData) {
    const query = this.summaryQuery().orderBy('name', 'asc').orderBy('catalogue_code', 'asc')

    if (!data.includeArchived) {
      query.whereNull('archived_at')
    }

    if (data.categoryId) {
      query.where('catalogue_category_id', data.categoryId)
    }

    if (data.stockType) {
      query.where('stock_type', data.stockType)
    }

    if (data.trackingMethod) {
      query.where('tracking_method', data.trackingMethod)
    }

    if (data.identificationStatus) {
      query.where('identification_status', data.identificationStatus)
    }

    if (data.search) {
      query.where((builder) => {
        builder
          .whereILike('catalogue_code', `%${data.search}%`)
          .orWhereILike('name', `%${data.search}%`)
          .orWhereILike('description', `%${data.search}%`)
          .orWhereHas('keywords', (keywordQuery) => {
            keywordQuery.whereILike('keyword', `%${data.search}%`)
          })
      })
    }

    return query.paginate(data.page ?? 1, ITEMS_PER_PAGE)
  }

  async lookup(data: LookupData) {
    const normalizedQuery = catalogueItemNameKey(data.query)

    const query = this.summaryQuery().where((builder) => {
      builder
        .whereILike('catalogue_code', `%${data.query}%`)
        .orWhereILike('name', `%${data.query}%`)
        .orWhereHas('keywords', (keywordQuery) => {
          keywordQuery.whereILike('keyword', `%${data.query}%`)
        })
    })

    if (!data.includeArchived) {
      query.whereNull('archived_at')
    }

    const items = await query.limit(LOOKUP_LIMIT * 2)

    const rank = (item: CatalogueItem): [number, CatalogueItemLookupMatchKind] => {
      if (item.catalogueCode.toLocaleLowerCase('en-US') === normalizedQuery) {
        return [0, 'EXACT_CODE']
      }

      if (item.normalizedName === normalizedQuery) {
        return [1, 'EXACT_NAME']
      }

      if (item.normalizedName.startsWith(normalizedQuery)) {
        return [2, 'PREFIX']
      }

      if (item.keywords.some(({ normalizedKeyword }) => normalizedKeyword === normalizedQuery)) {
        return [3, 'KEYWORD']
      }

      return [4, 'SUBSTRING']
    }

    return items
      .map((item) => ({ item, rank: rank(item) }))
      .sort(
        (left, right) =>
          left.rank[0] - right.rank[0] || left.item.name.localeCompare(right.item.name)
      )
      .slice(0, LOOKUP_LIMIT)
      .map(({ item, rank: [, matchKind] }) => ({ item, matchKind }))
  }

  findDetails(catalogueCode: string) {
    return this.detailQuery().where('catalogue_code', catalogueCode).firstOrFail()
  }
}
