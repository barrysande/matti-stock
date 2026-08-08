import BaseUnit from '#models/base_unit'
import type { baseUnitOptionsValidator, indexBaseUnitsValidator } from '#validators/base_unit'
import type { Infer } from '@vinejs/vine/types'

type ListData = Infer<typeof indexBaseUnitsValidator>
type OptionData = Infer<typeof baseUnitOptionsValidator>
const UNITS_PER_PAGE = 20

export default class BaseUnitDirectoryService {
  private summaryQuery() {
    return BaseUnit.query()
  }

  private detailQuery() {
    return BaseUnit.query()
  }

  private filteredQuery(data: OptionData) {
    const query = this.summaryQuery().orderBy('name', 'asc').orderBy('id', 'asc')

    if (!data.includeArchived) {
      query.whereNull('archived_at')
    }

    if (data.kind) {
      query.where('kind', data.kind)
    }

    if (data.search) {
      query.where((builder) => {
        builder.whereILike('name', `%${data.search}%`).orWhereILike('symbol', `%${data.search}%`)
      })
    }

    return query
  }

  /** Returns one fixed directory page of base units. */
  paginate(data: ListData) {
    return this.filteredQuery(data).paginate(data.page ?? 1, UNITS_PER_PAGE)
  }

  /** Lists all base units required for complete unit selectors. */
  listOptions(data: OptionData) {
    return this.filteredQuery(data)
  }

  /** Loads one active or archived unit from the current projection. */
  findDetails(unitId: string) {
    return this.detailQuery().where('id', unitId).firstOrFail()
  }
}
