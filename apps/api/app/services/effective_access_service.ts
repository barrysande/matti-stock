import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import type Delegation from '#models/delegation'
import RoleAssignment from '#models/role_assignment'
import DelegatedAccessQueryService from '#services/delegated_access_query_service'
import OrganizationalScopeService from '#services/organizational_scope_service'
import type { EffectiveAccessGrant, RoleAssignmentScopeMode } from '#types/role_assignment'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

@inject()
export default class EffectiveAccessService {
  constructor(
    private organizationalScopes: OrganizationalScopeService,
    private delegatedAccess: DelegatedAccessQueryService
  ) {}

  private query(client?: TransactionClientContract) {
    return client ? RoleAssignment.query({ client }) : RoleAssignment.query()
  }

  private grant(
    assignment: RoleAssignment,
    permissionKey: string,
    resolvedScopeOrganizationalUnitId: string,
    delegation: Delegation | null = null
  ): EffectiveAccessGrant {
    return {
      evidenceType: delegation ? 'DELEGATED' : 'DIRECT',
      assignment,
      assignmentId: assignment.id,
      delegation,
      delegationId: delegation?.id ?? null,
      delegatorAccountId: delegation?.delegatorAccountId ?? null,
      delegateAccountId: delegation?.delegateAccountId ?? null,
      permissionKey,
      roleId: assignment.roleVersion.role.id,
      roleKey: assignment.roleVersion.role.key,
      roleName: assignment.roleVersion.role.name,
      roleVersionId: assignment.roleVersion.id,
      roleVersion: Number(assignment.roleVersion.version),
      declaredScopeOrganizationalUnitId: assignment.scopeOrgUnitId,
      resolvedScopeOrganizationalUnitId,
      scopeMode: assignment.scopeMode as RoleAssignmentScopeMode,
    }
  }

  /** Builds the shared active-or-upcoming assignment window used by administrative consumers. */
  openAssignments(client?: TransactionClientContract, now: DateTime = DateTime.now()) {
    return this.query(client)
      .where((builder) => {
        builder.whereNull('expires_at').orWhere('expires_at', '>', now.toJSDate())
      })
      .whereDoesntHave('termination', (builder) => {
        builder.where('effective_at', '<=', now.toJSDate())
      })
  }

  private assignmentQuery(client: TransactionClientContract | undefined, now: DateTime) {
    return this.openAssignments(client, now)
      .where('starts_at', '<=', now.toJSDate())
      .whereHas('account', (builder) => {
        builder.where('status', 'ACTIVE')
      })
      .whereHas('scopeOrgUnit', (builder) => {
        builder.whereNull('archived_at')
      })
      .whereHas('roleVersion', (builder) => {
        builder.whereHas('role', (roleBuilder) => {
          roleBuilder.whereNull('archived_at')
        })
      })
      .preload('account', (builder) => {
        builder.preload('person')
      })
      .preload('scopeOrgUnit')
      .preload('termination')
      .preload('roleVersion', (builder) => {
        builder.preload('role').preload('permissions')
      })
      .orderBy('id', 'asc')
  }

  private matchingGrants(
    assignment: RoleAssignment,
    permissionKey: string | undefined,
    resolvedScopeOrganizationalUnitId: string,
    ancestorIds: Set<string>,
    delegation: Delegation | null = null
  ) {
    if (
      !this.organizationalScopes.matches(
        assignment.scopeOrgUnitId,
        assignment.scopeMode as RoleAssignmentScopeMode,
        resolvedScopeOrganizationalUnitId,
        ancestorIds
      )
    ) {
      return []
    }

    return assignment.roleVersion.permissions
      .filter((membership) => !permissionKey || membership.permissionKey === permissionKey)
      .map((membership) =>
        this.grant(
          assignment,
          membership.permissionKey,
          resolvedScopeOrganizationalUnitId,
          delegation
        )
      )
  }

  private async delegatedGrantsForAccount(
    accountId: string,
    resolvedScopeOrganizationalUnitId: string,
    ancestorIds: Set<string>,
    permissionKey?: string,
    client?: TransactionClientContract,
    now: DateTime = DateTime.now()
  ) {
    const links = await this.delegatedAccess.effectiveLinksForDelegate(accountId, client, now)
    if (links.length === 0) return []

    const assignments = await this.assignmentQuery(client, now).whereIn(
      'id',
      links.map(({ sourceAssignmentId }) => sourceAssignmentId)
    )
    const assignmentMap = new Map(assignments.map((assignment) => [assignment.id, assignment]))

    return links.flatMap((link) => {
      const assignment = assignmentMap.get(link.sourceAssignmentId)
      return assignment
        ? this.matchingGrants(
            assignment,
            permissionKey,
            resolvedScopeOrganizationalUnitId,
            ancestorIds,
            link.delegation
          )
        : []
    })
  }

  /** Loads every assignment that is synchronously effective before organizational matching. */
  effectiveAssignments(client?: TransactionClientContract, now: DateTime = DateTime.now()) {
    return this.assignmentQuery(client, now)
  }

  /** Resolves an account's effective permission grants at one organizational unit. */
  async grantsForAccount(
    accountId: string,
    resolvedScopeOrganizationalUnitId: string,
    permissionKey?: string,
    client?: TransactionClientContract,
    now: DateTime = DateTime.now()
  ) {
    const scope = await this.organizationalScopes.ancestorIds(
      resolvedScopeOrganizationalUnitId,
      client
    )
    if (!scope || scope.target.archivedAt) {
      return []
    }

    const assignments = await this.assignmentQuery(client, now).where('account_id', accountId)
    const direct = assignments.flatMap((assignment) =>
      this.matchingGrants(assignment, permissionKey, resolvedScopeOrganizationalUnitId, scope.ids)
    )
    const delegated = await this.delegatedGrantsForAccount(
      accountId,
      resolvedScopeOrganizationalUnitId,
      scope.ids,
      permissionKey,
      client,
      now
    )
    return [...direct, ...delegated]
  }

  /** Resolves an account's effective grants at their declared scopes for access-overview clients. */
  async grantsAcrossScopesForAccount(
    accountId: string,
    client?: TransactionClientContract,
    now: DateTime = DateTime.now()
  ) {
    const assignments = await this.assignmentQuery(client, now).where('account_id', accountId)
    const direct = assignments.flatMap((assignment) =>
      assignment.roleVersion.permissions.map((membership) =>
        this.grant(assignment, membership.permissionKey, assignment.scopeOrgUnitId)
      )
    )
    const links = await this.delegatedAccess.effectiveLinksForDelegate(accountId, client, now)
    if (links.length === 0) return direct

    const sources = await this.assignmentQuery(client, now).whereIn(
      'id',
      links.map(({ sourceAssignmentId }) => sourceAssignmentId)
    )
    const sourceMap = new Map(sources.map((assignment) => [assignment.id, assignment]))
    const delegated = links.flatMap((link) => {
      const assignment = sourceMap.get(link.sourceAssignmentId)
      return assignment
        ? assignment.roleVersion.permissions.map((membership) =>
            this.grant(
              assignment,
              membership.permissionKey,
              assignment.scopeOrgUnitId,
              link.delegation
            )
          )
        : []
    })
    return [...direct, ...delegated]
  }

  /** Returns the grant that authorizes an action, or null when access is denied. */
  async authorize(
    accountId: string,
    permissionKey: string,
    resolvedScopeOrganizationalUnitId: string,
    client?: TransactionClientContract,
    now: DateTime = DateTime.now()
  ) {
    const grants = await this.grantsForAccount(
      accountId,
      resolvedScopeOrganizationalUnitId,
      permissionKey,
      client,
      now
    )
    return grants[0] ?? null
  }
}
