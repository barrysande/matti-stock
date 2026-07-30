import OrganizationalUnit from '#models/organizational_unit'
import type { indexOrganizationalUnitsValidator } from '#validators/organizational_unit'
import type { Infer } from '@vinejs/vine/types'

type ListData = Infer<typeof indexOrganizationalUnitsValidator>

export default class OrganizationalUnitDirectoryService {
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

  private assignPaths(units: OrganizationalUnit[]) {
    const unitMap = new Map(units.map((unit) => [unit.id, unit]))

    for (const unit of units) {
      unit.$extras.path = this.pathFor(unit, unitMap)
    }

    return units
  }

  /** Lists the current organizational projection with stable, unambiguous hierarchy paths. */
  async list(data: ListData) {
    const query = OrganizationalUnit.query().orderBy('name', 'asc').orderBy('id', 'asc')

    if (!data.includeArchived) {
      query.whereNull('archived_at')
    }

    if (data.unitType) {
      query.where('unit_type', data.unitType)
    }

    if (data.search) {
      query.whereILike('name', `%${data.search}%`)
    }

    const units = this.assignPaths(await query)
    return units.sort((left, right) => {
      const pathOrder = String(left.$extras.path).localeCompare(String(right.$extras.path))
      return pathOrder || left.id.localeCompare(right.id)
    })
  }

  /** Loads one unit together with its complete effective-dated structural history. */
  async overview(unitId: string) {
    const [unit, allUnits] = await Promise.all([
      OrganizationalUnit.query()
        .where('id', unitId)
        .preload('versions', (versionQuery) => {
          versionQuery
            .preload('parent')
            .preload('changedByAccount', (accountQuery) => {
              accountQuery.preload('person')
            })
            .orderBy('version', 'desc')
        })
        .firstOrFail(),
      OrganizationalUnit.query().orderBy('id', 'asc'),
    ])

    this.assignPaths([...allUnits, unit])
    return unit
  }
}
