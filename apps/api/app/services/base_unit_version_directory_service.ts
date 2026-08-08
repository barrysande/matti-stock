import BaseUnit from '#models/base_unit'
import BaseUnitVersion from '#models/base_unit_version'
import type { baseUnitHistoryValidator } from '#validators/base_unit'
import type { Infer } from '@vinejs/vine/types'

const VERSIONS_PER_PAGE = 20

type HistoryData = Infer<typeof baseUnitHistoryValidator>

export default class BaseUnitVersionDirectoryService {
  /** Returns one reverse-chronological page of base-unit versions. */
  async list(unitId: string, data: HistoryData) {
    await BaseUnit.findOrFail(unitId)

    return BaseUnitVersion.query()
      .where('base_unit_id', unitId)
      .preload('changedByAccount', (accountQuery) => {
        accountQuery.preload('person')
      })
      .preload('resolvedScopeOrganizationalUnit')
      .orderBy('version', 'desc')
      .paginate(data.page ?? 1, VERSIONS_PER_PAGE)
  }
}
