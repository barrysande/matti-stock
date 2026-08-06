import PhysicalLocation from '#models/physical_location'
import type { indexPhysicalLocationsValidator } from '#validators/physical_location'
import type { Infer } from '@vinejs/vine/types'

type ListData = Infer<typeof indexPhysicalLocationsValidator>

export default class PhysicalLocationDirectoryService {
  private summaryQuery() {
    return PhysicalLocation.query()
  }

  private detailQuery() {
    return PhysicalLocation.query().preload('versions', (versionQuery) => {
      versionQuery
        .preload('parent')
        .preload('changedByAccount', (accountQuery) => {
          accountQuery.preload('person')
        })
        .orderBy('version', 'desc')
    })
  }

  private pathFor(
    location: PhysicalLocation,
    locations: Map<string, PhysicalLocation>,
    visited = new Set<string>()
  ): string {
    if (visited.has(location.id)) {
      throw new Error('Circular physical-location hierarchy detected while building a path')
    }

    if (!location.parentId) {
      return location.name
    }

    const parent = locations.get(location.parentId)

    if (!parent) {
      return location.name
    }

    visited.add(location.id)

    return `${this.pathFor(parent, locations, visited)} / ${location.name}`
  }

  private assignPaths(locations: PhysicalLocation[], hierarchy: PhysicalLocation[]) {
    const locationMap = new Map(hierarchy.map((location) => [location.id, location]))

    for (const location of locations) {
      location.$extras.path = this.pathFor(location, locationMap)
    }

    return locations
  }

  /** Lists physical locations with stable full paths and optional current-state filters. */
  async list(data: ListData) {
    const query = this.summaryQuery().orderBy('name', 'asc').orderBy('id', 'asc')

    if (!data.includeArchived) {
      query.whereNull('archived_at')
    }

    if (data.search) {
      query.whereILike('name', `%${data.search}%`)
    }

    const [locations, hierarchy] = await Promise.all([
      query,
      this.summaryQuery().orderBy('id', 'asc'),
    ])

    return this.assignPaths(locations, hierarchy).sort((left, right) => {
      const pathOrder = String(left.$extras.path).localeCompare(String(right.$extras.path))

      return pathOrder || left.id.localeCompare(right.id)
    })
  }

  /** Loads one physical location with its complete effective-dated structural history. */
  async findDetails(locationId: string) {
    const [location, hierarchy] = await Promise.all([
      this.detailQuery().where('id', locationId).firstOrFail(),
      this.summaryQuery().orderBy('id', 'asc'),
    ])

    this.assignPaths([location], hierarchy)

    return location
  }
}
