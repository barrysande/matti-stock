import { createHash } from 'node:crypto'
import { DateTime } from 'luxon'
import InvalidOrganizationalUnitChangeException from '#exceptions/invalid_organizational_unit_change_exception'
import OrganizationalUnit from '#models/organizational_unit'
import RoleAssignment from '#models/role_assignment'
import type {
  OrganizationalAccessImpact,
  OrganizationalImpactRequest,
  OrganizationalUnitType,
} from '#types/organization'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export default class OrganizationalAccessImpactService {
  private invalid(message: string): never {
    throw new InvalidOrganizationalUnitChangeException(message)
  }

  private ancestors(unitId: string, units: Map<string, OrganizationalUnit>): OrganizationalUnit[] {
    const ancestors: OrganizationalUnit[] = []
    const visited = new Set<string>()
    let current = units.get(unitId)

    while (current) {
      if (visited.has(current.id)) {
        this.invalid('The organizational hierarchy contains a circular parent relationship.')
      }

      visited.add(current.id)
      ancestors.push(current)
      current = current.parentId ? units.get(current.parentId) : undefined
    }

    return ancestors
  }

  private assertActiveParent(
    parent: OrganizationalUnit | undefined,
    childType: Exclude<OrganizationalUnitType, 'INSTITUTE'>
  ) {
    if (!parent || parent.archivedAt) {
      this.invalid('The selected organizational parent is unavailable.')
    }

    const expectedParentType = childType === 'DEPARTMENT' ? 'INSTITUTE' : 'DEPARTMENT'
    if (parent.unitType !== expectedParentType) {
      this.invalid(
        childType === 'DEPARTMENT'
          ? 'A department must belong directly to the institute.'
          : 'A sub-department must belong directly to a department.'
      )
    }
  }

  private resolveChangedScopes(request: OrganizationalImpactRequest, units: OrganizationalUnit[]) {
    const unitMap = new Map(units.map((unit) => [unit.id, unit]))
    const target = unitMap.get(request.targetUnitId)
    const relevantUnits = new Map<string, OrganizationalUnit>()
    const changedScopeIds = new Set<string>()

    const includeAncestors = (unitId: string) => {
      for (const unit of this.ancestors(unitId, unitMap)) {
        changedScopeIds.add(unit.id)
        relevantUnits.set(unit.id, unit)
      }
    }

    if (request.operation === 'CREATE_CHILD') {
      if (!request.childUnitType) {
        this.invalid('The child organizational-unit type is required for an access preview.')
      }

      this.assertActiveParent(target, request.childUnitType)
      includeAncestors(request.targetUnitId)
    } else if (request.operation === 'REPARENT') {
      if (!target || target.archivedAt || target.unitType !== 'SUB_DEPARTMENT') {
        this.invalid('Only an active sub-department may be moved to another department.')
      }
      if (!request.parentId || request.parentId === target.parentId) {
        this.invalid('Select a different parent department.')
      }

      const parent = unitMap.get(request.parentId)
      this.assertActiveParent(parent, 'SUB_DEPARTMENT')

      const previousAncestors = new Set(
        this.ancestors(target.parentId!, unitMap).map((unit) => unit.id)
      )
      const nextAncestors = new Set(
        this.ancestors(request.parentId, unitMap).map((unit) => unit.id)
      )

      for (const id of new Set([...previousAncestors, ...nextAncestors])) {
        if (previousAncestors.has(id) !== nextAncestors.has(id)) {
          changedScopeIds.add(id)
        }
      }

      relevantUnits.set(target.id, target)
      for (const id of new Set([...previousAncestors, ...nextAncestors])) {
        const unit = unitMap.get(id)
        if (unit) {
          relevantUnits.set(id, unit)
        }
      }
    } else {
      if (!target || target.unitType === 'INSTITUTE') {
        this.invalid('The institute root cannot be archived or restored.')
      }

      if (request.operation === 'ARCHIVE') {
        if (target.archivedAt) {
          this.invalid('The organizational unit is already archived.')
        }

        const activeChild = units.find((unit) => unit.parentId === target.id && !unit.archivedAt)
        if (activeChild) {
          this.invalid('Archive or move active child units before archiving this unit.')
        }
      } else if (!target.archivedAt) {
        this.invalid('The organizational unit is not archived.')
      }

      if (request.operation === 'RESTORE') {
        const parent = target.parentId ? unitMap.get(target.parentId) : undefined
        this.assertActiveParent(
          parent,
          target.unitType as Exclude<OrganizationalUnitType, 'INSTITUTE'>
        )
      }

      includeAncestors(target.id)
    }

    return { changedScopeIds, relevantUnits, target }
  }

  private assignmentQuery(client: TransactionClientContract | undefined, now: DateTime) {
    const query = client ? RoleAssignment.query({ client }) : RoleAssignment.query()

    return query
      .where((builder) => {
        builder.whereNull('expires_at').orWhere('expires_at', '>', now.toJSDate())
      })
      .whereHas('roleVersion', (versionQuery) => {
        versionQuery.whereHas('role', (roleQuery) => {
          roleQuery.whereNull('archived_at')
        })
      })
      .preload('account', (accountQuery) => {
        accountQuery.preload('person')
      })
      .preload('roleVersion', (versionQuery) => {
        versionQuery.preload('role')
      })
      .preload('scopeOrgUnit')
      .orderBy('id', 'asc')
  }

  private fingerprint(
    request: OrganizationalImpactRequest,
    relevantUnits: OrganizationalUnit[],
    assignments: RoleAssignment[]
  ) {
    const state = {
      operation: request.operation,
      targetUnitId: request.targetUnitId,
      parentId: request.parentId ?? null,
      childUnitType: request.childUnitType ?? null,
      units: [...relevantUnits]
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((unit) => ({
          id: unit.id,
          parentId: unit.parentId,
          unitType: unit.unitType,
          archivedAt: unit.archivedAt?.toISO() ?? null,
          updatedAt: unit.updatedAt.toISO(),
        })),
      assignments: [...assignments]
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((assignment) => ({
          id: assignment.id,
          accountId: assignment.accountId,
          roleVersionId: assignment.roleVersionId,
          scopeOrgUnitId: assignment.scopeOrgUnitId,
          scopeMode: assignment.scopeMode,
          startsAt: assignment.startsAt.toISO(),
          expiresAt: assignment.expiresAt?.toISO() ?? null,
        })),
    }

    return createHash('sha256').update(JSON.stringify(state)).digest('hex')
  }

  /**
   * Resolves assignments whose effective organizational reach would change.
   * The fingerprint binds a later mutation to the reviewed hierarchy and assignment state.
   */
  async preview(
    request: OrganizationalImpactRequest,
    client?: TransactionClientContract,
    now: DateTime = DateTime.now()
  ): Promise<OrganizationalAccessImpact> {
    const units = await (client
      ? OrganizationalUnit.query({ client }).orderBy('id', 'asc')
      : OrganizationalUnit.query().orderBy('id', 'asc'))
    const { changedScopeIds, relevantUnits, target } = this.resolveChangedScopes(request, units)
    const candidates = await this.assignmentQuery(client, now)
    const assignments = candidates.filter((assignment) => {
      if (
        (request.operation === 'ARCHIVE' || request.operation === 'RESTORE') &&
        assignment.scopeOrgUnitId === target?.id
      ) {
        return true
      }

      return (
        assignment.scopeMode === 'INCLUDE_DESCENDANTS' &&
        changedScopeIds.has(assignment.scopeOrgUnitId)
      )
    })

    return {
      operation: request.operation,
      fingerprint: this.fingerprint(request, [...relevantUnits.values()], assignments),
      assignments: assignments.map((assignment) => ({
        id: assignment.id,
        account: {
          id: assignment.account.id,
          displayName: assignment.account.person.displayName,
          status: assignment.account.status,
        },
        role: {
          id: assignment.roleVersion.role.id,
          key: assignment.roleVersion.role.key,
          name: assignment.roleVersion.role.name,
          version: Number(assignment.roleVersion.version),
        },
        scope: {
          organizationalUnitId: assignment.scopeOrgUnit.id,
          name: assignment.scopeOrgUnit.name,
          mode: assignment.scopeMode,
        },
        startsAt: assignment.startsAt,
        expiresAt: assignment.expiresAt,
      })),
    }
  }
}
