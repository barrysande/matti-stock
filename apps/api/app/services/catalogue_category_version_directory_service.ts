import CatalogueCategory from '#models/catalogue_category'
import CatalogueCategoryVersion from '#models/catalogue_category_version'
import type { catalogueCategoryHistoryValidator } from '#validators/catalogue_category'
import type { Infer } from '@vinejs/vine/types'

const VERSIONS_PER_PAGE = 20

type HistoryData = Infer<typeof catalogueCategoryHistoryValidator>

export default class CatalogueCategoryVersionDirectoryService {
  /** Returns one reverse-chronological page of catalogue-category versions. */
  async list(categoryId: string, data: HistoryData) {
    await CatalogueCategory.findOrFail(categoryId)

    return CatalogueCategoryVersion.query()
      .where('catalogue_category_id', categoryId)
      .preload('parent')
      .preload('mergedIntoCategory')
      .preload('changedByAccount', (accountQuery) => {
        accountQuery.preload('person')
      })
      .preload('resolvedScopeOrganizationalUnit')
      .orderBy('version', 'desc')
      .paginate(data.page ?? 1, VERSIONS_PER_PAGE)
  }
}
