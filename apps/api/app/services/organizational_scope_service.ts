import OrganizationalUnit from '#models/organizational_unit'
import type { RoleAssignmentScopeMode } from '#types/role_assignment'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export default class OrganizationalScopeService {
  private pathFor(
    unit: OrganizationalUnit,
    units: Map<string, OrganizationalUnit>,
    visited = new Set<string>()
  ): string {
    if (visited.has(unit.id)) {
      throw new Error('Circular organizational hierarchy detected while resolving access scope')
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

  private query(client?: TransactionClientContract) {
    return client ? OrganizationalUnit.query({ client }) : OrganizationalUnit.query()
  }

  /** Loads the current organizational hierarchy and assigns an unambiguous path to each unit. */
  async hierarchy(client?: TransactionClientContract) {
    const units = await this.query(client).orderBy('id', 'asc')
    const unitMap = new Map(units.map((unit) => [unit.id, unit]))

    for (const unit of units) {
      unit.$extras.path = this.pathFor(unit, unitMap)
    }

    return { units, unitMap }
  }

  /** Resolves the selected unit and every current ancestor used by descendant-aware access checks. */
  async ancestorIds(unitId: string, client?: TransactionClientContract) {
    const { unitMap } = await this.hierarchy(client)
    const target = unitMap.get(unitId)
    if (!target) {
      return null
    }

    const ids = new Set<string>()
    const visited = new Set<string>()
    let current: OrganizationalUnit | undefined = target

    while (current) {
      if (visited.has(current.id)) {
        throw new Error('Circular organizational hierarchy detected while resolving access scope')
      }

      visited.add(current.id)
      ids.add(current.id)
      current = current.parentId ? unitMap.get(current.parentId) : undefined
    }

    return { target, ids }
  }

  /** Determines whether a declared assignment scope reaches one resolved organizational unit. */
  matches(
    declaredScopeId: string,
    mode: RoleAssignmentScopeMode,
    resolvedScopeId: string,
    ancestorIds: Set<string>
  ) {
    return (
      declaredScopeId === resolvedScopeId ||
      (mode === 'INCLUDE_DESCENDANTS' && ancestorIds.has(declaredScopeId))
    )
  }
}
