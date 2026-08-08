import OrganizationalUnit from '#models/organizational_unit'
import type { indexOrganizationalUnitsValidator } from '#validators/organizational_unit'
import type { Infer } from '@vinejs/vine/types'

type ListData = Infer<typeof indexOrganizationalUnitsValidator>

export default class OrganizationalUnitDirectoryService {
  private summaryQuery() {
    return OrganizationalUnit.query()
  }

  private detailQuery() {
    return OrganizationalUnit.query()
  }

  private pathFor(
    unit: OrganizationalUnit,
    units: Map<string, OrganizationalUnit>,
    visited = new Set<string>()
  ): string {
    if (visited.has(unit.id)) {
      throw new Error('Circular organizational hierarchy detected while building a unit path')
    }

    if (!unit.parentId) {
      return unit.name
    }

    const parent = units.get(unit.parentId)

    if (!parent) {
      return unit.name
    }

    visited.add(unit.id)

    return `${this.pathFor(parent, units, visited)} / ${unit.name}`
  }

  private assignPaths(units: OrganizationalUnit[], hierarchyUnits: OrganizationalUnit[] = units) {
    const unitMap = new Map(hierarchyUnits.map((unit) => [unit.id, unit]))

    for (const unit of units) {
      unit.$extras.path = this.pathFor(unit, unitMap)
    }

    return units
  }

  /** Lists the current organizational projection with stable, unambiguous hierarchy paths. */
  async list(data: ListData) {
    const query = this.summaryQuery().orderBy('name', 'asc').orderBy('id', 'asc')

    if (!data.includeArchived) {
      query.whereNull('archived_at')
    }

    if (data.unitType) {
      query.where('unit_type', data.unitType)
    }

    if (data.search) {
      query.whereILike('name', `%${data.search}%`)
    }

    const [units, hierarchyUnits] = await Promise.all([
      query,
      this.summaryQuery().orderBy('id', 'asc'),
    ])

    this.assignPaths(units, hierarchyUnits)

    return units.sort((left, right) => {
      const pathOrder = String(left.$extras.path).localeCompare(String(right.$extras.path))

      return pathOrder || left.id.localeCompare(right.id)
    })
  }

  /** Loads one unit from the current organizational projection. */
  async findDetails(unitId: string) {
    const [unit, allUnits] = await Promise.all([
      this.detailQuery().where('id', unitId).firstOrFail(),
      this.summaryQuery().orderBy('id', 'asc'),
    ])

    this.assignPaths([...allUnits, unit])

    return unit
  }
}
