import BaseUnit from '#models/base_unit'
import type { indexBaseUnitsValidator } from '#validators/base_unit'
import type { Infer } from '@vinejs/vine/types'

type ListData = Infer<typeof indexBaseUnitsValidator>

export default class BaseUnitDirectoryService {
  private summaryQuery() {
    return BaseUnit.query()
  }

  private detailQuery() {
    return BaseUnit.query().preload('versions', (versionQuery) => {
      versionQuery
        .preload('changedByAccount', (accountQuery) => accountQuery.preload('person'))
        .preload('resolvedScopeOrganizationalUnit')
        .orderBy('version', 'desc')
    })
  }

  /** Lists the small shared unit registry with optional active-state and kind filters. */
  list(data: ListData) {
    const query = this.summaryQuery().orderBy('name', 'asc').orderBy('id', 'asc')
    if (!data.includeArchived) query.whereNull('archived_at')
    if (data.kind) query.where('kind', data.kind)
    if (data.search) {
      query.where((builder) => {
        builder.whereILike('name', `%${data.search}%`).orWhereILike('symbol', `%${data.search}%`)
      })
    }
    return query
  }

  /** Loads one active or archived unit with complete effective-dated history. */
  findDetails(unitId: string) {
    return this.detailQuery().where('id', unitId).firstOrFail()
  }
}
