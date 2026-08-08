import OrganizationalUnit from '#models/organizational_unit'
import OrganizationalUnitVersion from '#models/organizational_unit_version'
import type { organizationalUnitHistoryValidator } from '#validators/organizational_unit'
import type { Infer } from '@vinejs/vine/types'

const VERSIONS_PER_PAGE = 20

type HistoryData = Infer<typeof organizationalUnitHistoryValidator>

export default class OrganizationalUnitVersionDirectoryService {
  /** Returns one reverse-chronological page of organizational-unit versions. */
  async list(unitId: string, data: HistoryData) {
    await OrganizationalUnit.findOrFail(unitId)

    return OrganizationalUnitVersion.query()
      .where('organizational_unit_id', unitId)
      .preload('parent')
      .preload('changedByAccount', (accountQuery) => {
        accountQuery.preload('person')
      })
      .orderBy('version', 'desc')
      .paginate(data.page ?? 1, VERSIONS_PER_PAGE)
  }
}
