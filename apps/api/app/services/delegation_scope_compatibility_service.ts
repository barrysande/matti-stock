import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import type OrganizationalUnit from '#models/organizational_unit'
import type RoleAssignment from '#models/role_assignment'
import EffectiveAccessService from '#services/effective_access_service'
import OrganizationalScopeService from '#services/organizational_scope_service'
import RoleAssignmentLifecycleService from '#services/role_assignment_lifecycle_service'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

@inject()
export default class DelegationScopeCompatibilityService {
  constructor(
    private effectiveAccess: EffectiveAccessService,
    private organizationalScopes: OrganizationalScopeService,
    private assignmentLifecycle: RoleAssignmentLifecycleService
  ) {}

  private grantsProtectedRoot(assignment: RoleAssignment) {
    return (
      assignment.roleVersion.role.key === 'MASTER_ADMIN' ||
      assignment.roleVersion.permissions.some(
        ({ permissionKey }) => permissionKey === 'access.root'
      )
    )
  }

  private branchId(unitId: string, unitMap: Map<string, OrganizationalUnit>) {
    let unit = unitMap.get(unitId)

    if (!unit) return null
    if (unit.unitType === 'INSTITUTE') return unit.id

    const visited = new Set<string>()

    while (unit.parentId) {
      if (visited.has(unit.id)) {
        throw new Error(
          'Circular organizational hierarchy detected while checking delegation scope'
        )
      }

      visited.add(unit.id)

      const parent = unitMap.get(unit.parentId)

      if (!parent) return unit.id
      if (parent.unitType === 'INSTITUTE') return unit.id
      unit = parent
    }

    return unit.id
  }

  private async directAssignments(
    accountId: string,
    client?: TransactionClientContract,
    now: DateTime = DateTime.now()
  ) {
    const assignments = await this.effectiveAccess
      .effectiveAssignments(client, now)
      .where('account_id', accountId)

    return assignments.filter((assignment) => !this.grantsProtectedRoot(assignment))
  }

  delegatableSources(
    accountId: string,
    client?: TransactionClientContract,
    now: DateTime = DateTime.now()
  ) {
    return this.directAssignments(accountId, client, now)
  }

  async compatibleSourcesByCandidate(
    sources: RoleAssignment[],
    delegateAccountIds: string[],
    expiresAt?: DateTime,
    client?: TransactionClientContract,
    now: DateTime = DateTime.now()
  ) {
    if (delegateAccountIds.length === 0) return new Map<string, RoleAssignment[]>()

    const affiliations = await this.effectiveAccess
      .effectiveAssignments(client, now)
      .whereIn('account_id', delegateAccountIds)

    const eligibleAffiliations = affiliations.filter((assignment) => {
      if (this.grantsProtectedRoot(assignment)) return false
      if (!expiresAt) return true
      const effectiveEnd = this.assignmentLifecycle.effectiveEnd(assignment)

      return !effectiveEnd || effectiveEnd >= expiresAt
    })

    const { unitMap } = await this.organizationalScopes.hierarchy(client)
    const sourceBranches = new Map(
      sources.map((source) => [source.id, this.branchId(source.scopeOrgUnitId, unitMap)])
    )
    const affiliationBranches = new Map<string, Set<string>>()

    for (const assignment of eligibleAffiliations) {
      const branchId = this.branchId(assignment.scopeOrgUnitId, unitMap)

      if (!branchId) continue
      const branches = affiliationBranches.get(assignment.accountId) ?? new Set<string>()

      branches.add(branchId)
      affiliationBranches.set(assignment.accountId, branches)
    }

    return new Map(
      delegateAccountIds.map((accountId) => {
        const branches = affiliationBranches.get(accountId) ?? new Set<string>()

        return [
          accountId,
          sources.filter((source) => {
            const branchId = sourceBranches.get(source.id)

            return branchId ? branches.has(branchId) : false
          }),
        ] as const
      })
    )
  }

  async compatibleSources(
    sources: RoleAssignment[],
    delegateAccountId: string,
    expiresAt?: DateTime,
    client?: TransactionClientContract,
    now: DateTime = DateTime.now()
  ) {
    const compatible = await this.compatibleSourcesByCandidate(
      sources,
      [delegateAccountId],
      expiresAt,
      client,
      now
    )

    return compatible.get(delegateAccountId) ?? []
  }
}
