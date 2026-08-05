import CatalogueCategory from '#models/catalogue_category'
import type { indexCatalogueCategoriesValidator } from '#validators/catalogue_category'
import type { Infer } from '@vinejs/vine/types'

type ListData = Infer<typeof indexCatalogueCategoriesValidator>

export default class CatalogueCategoryDirectoryService {
  private summaryQuery() {
    return CatalogueCategory.query()
  }

  private detailQuery() {
    return CatalogueCategory.query().preload('versions', (versionQuery) => {
      versionQuery
        .preload('parent')
        .preload('changedByAccount', (accountQuery) => accountQuery.preload('person'))
        .preload('resolvedScopeOrganizationalUnit')
        .orderBy('version', 'desc')
    })
  }

  private pathFor(
    category: CatalogueCategory,
    categories: Map<string, CatalogueCategory>,
    visited = new Set<string>()
  ): string {
    if (visited.has(category.id)) {
      throw new Error('Circular catalogue-category hierarchy detected while building a path')
    }
    if (!category.parentId) return category.name

    const parent = categories.get(category.parentId)
    if (!parent) return category.name

    visited.add(category.id)
    return `${this.pathFor(parent, categories, visited)} / ${category.name}`
  }

  private assignPaths(categories: CatalogueCategory[], hierarchy: CatalogueCategory[]) {
    const categoryMap = new Map(hierarchy.map((category) => [category.id, category]))
    for (const category of categories) {
      const path = this.pathFor(category, categoryMap)
      category.$extras.path = path
      category.$extras.depth = path.split(' / ').length
    }
    return categories
  }

  /** Lists the small shared category hierarchy with stable paths and optional archived records. */
  async list(data: ListData) {
    const query = this.summaryQuery().orderBy('name', 'asc').orderBy('id', 'asc')
    if (!data.includeArchived) query.whereNull('archived_at')
    if (data.search) {
      query.where((builder) => {
        builder
          .whereILike('name', `%${data.search}%`)
          .orWhereILike('description', `%${data.search}%`)
      })
    }

    const [categories, hierarchy] = await Promise.all([
      query,
      this.summaryQuery().orderBy('id', 'asc'),
    ])
    return this.assignPaths(categories, hierarchy).sort((left, right) => {
      const pathOrder = String(left.$extras.path).localeCompare(String(right.$extras.path))
      return pathOrder || left.id.localeCompare(right.id)
    })
  }

  /** Loads one active or archived category with complete effective-dated history. */
  async overview(categoryId: string) {
    const [category, hierarchy] = await Promise.all([
      this.detailQuery().where('id', categoryId).firstOrFail(),
      this.summaryQuery().orderBy('id', 'asc'),
    ])
    this.assignPaths([category], hierarchy)
    return category
  }
}
