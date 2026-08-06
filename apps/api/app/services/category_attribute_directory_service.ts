import CategoryAttribute from '#models/category_attribute'
import type { indexCategoryAttributesValidator } from '#validators/category_attribute'
import type { Infer } from '@vinejs/vine/types'

type ListData = Infer<typeof indexCategoryAttributesValidator>

export default class CategoryAttributeDirectoryService {
  private summaryQuery() {
    return CategoryAttribute.query()
      .preload('catalogueCategory')
      .preload('choices', (choiceQuery) => {
        choiceQuery.whereNull('archived_at').orderBy('display_order', 'asc').orderBy('id', 'asc')
      })
  }

  private detailQuery() {
    return CategoryAttribute.query()
      .preload('catalogueCategory')
      .preload('versions', (versionQuery) => {
        versionQuery
          .preload('catalogueCategory')
          .preload('changedByAccount', (accountQuery) => accountQuery.preload('person'))
          .preload('resolvedScopeOrganizationalUnit')
          .orderBy('version', 'desc')
      })
      .preload('choices', (choiceQuery) => {
        choiceQuery
          .preload('versions', (versionQuery) => {
            versionQuery
              .preload('changedByAccount', (accountQuery) => accountQuery.preload('person'))
              .preload('resolvedScopeOrganizationalUnit')
              .orderBy('version', 'desc')
          })
          .orderBy('display_order', 'asc')
          .orderBy('label', 'asc')
          .orderBy('id', 'asc')
      })
  }

  list(data: ListData) {
    const query = this.summaryQuery().orderBy('name', 'asc').orderBy('id', 'asc')
    if (!data.includeArchived) query.whereNull('archived_at')
    if (data.categoryId) query.where('catalogue_category_id', data.categoryId)
    if (data.scope) query.where('scope', data.scope)
    if (data.dataType) query.where('data_type', data.dataType)
    if (data.search) {
      query.where((builder) => {
        builder
          .whereILike('name', `%${data.search}%`)
          .orWhereILike('description', `%${data.search}%`)
      })
    }
    return query
  }

  overview(attributeId: string) {
    return this.detailQuery().where('id', attributeId).firstOrFail()
  }
}
