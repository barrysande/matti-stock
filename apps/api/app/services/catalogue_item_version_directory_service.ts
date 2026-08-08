import CatalogueItem from '#models/catalogue_item'
import CatalogueItemVersion from '#models/catalogue_item_version'
import type { catalogueItemHistoryValidator } from '#validators/catalogue_item'
import type { Infer } from '@vinejs/vine/types'

const VERSIONS_PER_PAGE = 20

type HistoryData = Infer<typeof catalogueItemHistoryValidator>

export default class CatalogueItemVersionDirectoryService {
  /** Returns one reverse-chronological page of catalogue-item versions. */
  async list(catalogueCode: string, data: HistoryData) {
    const item = await CatalogueItem.findByOrFail('catalogueCode', catalogueCode)

    return CatalogueItemVersion.query()
      .where('catalogue_item_id', item.id)
      .preload('catalogueCategory')
      .preload('baseUnit')
      .preload('changedByAccount', (accountQuery) => {
        accountQuery.preload('person')
      })
      .preload('resolvedScopeOrganizationalUnit')
      .preload('keywords', (keywordQuery) => {
        keywordQuery.orderBy('display_order', 'asc')
      })
      .preload('reviewedCandidates', (candidateQuery) => {
        candidateQuery.preload('candidateCatalogueItem').orderBy('display_order', 'asc')
      })
      .orderBy('version', 'desc')
      .paginate(data.page ?? 1, VERSIONS_PER_PAGE)
  }
}
