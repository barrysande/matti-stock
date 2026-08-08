import PhysicalLocation from '#models/physical_location'
import PhysicalLocationVersion from '#models/physical_location_version'
import type { physicalLocationHistoryValidator } from '#validators/physical_location'
import type { Infer } from '@vinejs/vine/types'

const VERSIONS_PER_PAGE = 20

type HistoryData = Infer<typeof physicalLocationHistoryValidator>

export default class PhysicalLocationVersionDirectoryService {
  /** Returns one reverse-chronological page of physical-location versions. */
  async list(locationId: string, data: HistoryData) {
    await PhysicalLocation.findOrFail(locationId)

    return PhysicalLocationVersion.query()
      .where('physical_location_id', locationId)
      .preload('parent')
      .preload('changedByAccount', (accountQuery) => {
        accountQuery.preload('person')
      })
      .orderBy('version', 'desc')
      .paginate(data.page ?? 1, VERSIONS_PER_PAGE)
  }
}
