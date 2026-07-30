import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import RoleAssignment from '#models/role_assignment'
import OrganizationalScopeService from '#services/organizational_scope_service'
import type {
  EffectiveAccessGrant,
  RoleAssignmentIneffectiveReason,
  RoleAssignmentScopeMode,
  RoleAssignmentState,
  RoleAssignmentStatus,
} from '#types/role_assignment'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

@inject()
export default class EffectiveAccessService {
  constructor(private organizationalScopes: OrganizationalScopeService) {}

  private query(client?: TransactionClientContract) {
    return client ? RoleAssignment.query({ client }) : RoleAssignment.query()
  }

  private grant(
    assignment: RoleAssignment,
    permissionKey: string,
    resolvedScopeOrganizationalUnitId: string
  ): EffectiveAccessGrant {
    return {
      assignment,
      assignmentId: assignment.id,
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

  /** Returns the earliest natural expiry or append-only termination for one assignment. */
  effectiveEnd(assignment: RoleAssignment) {
    if (
      assignment.termination &&
      (!assignment.expiresAt || assignment.termination.effectiveAt < assignment.expiresAt)
    ) {
      return assignment.termination.effectiveAt
    }
    return assignment.expiresAt
  }

  /** Determines whether an assignment remains active or upcoming rather than historically closed. */
  isOpen(assignment: RoleAssignment, now: DateTime = DateTime.now()) {
    const endsAt = this.effectiveEnd(assignment)
    return !endsAt || endsAt > now
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
    const grants: EffectiveAccessGrant[] = []

    for (const assignment of assignments) {
      if (
        !this.organizationalScopes.matches(
          assignment.scopeOrgUnitId,
          assignment.scopeMode as RoleAssignmentScopeMode,
          resolvedScopeOrganizationalUnitId,
          scope.ids
        )
      ) {
        continue
      }

      for (const membership of assignment.roleVersion.permissions) {
        if (!permissionKey || membership.permissionKey === permissionKey) {
          grants.push(
            this.grant(assignment, membership.permissionKey, resolvedScopeOrganizationalUnitId)
          )
        }
      }
    }

    return grants
  }

  /** Resolves an account's effective grants at their declared scopes for access-overview clients. */
  async grantsAcrossScopesForAccount(
    accountId: string,
    client?: TransactionClientContract,
    now: DateTime = DateTime.now()
  ) {
    const assignments = await this.assignmentQuery(client, now).where('account_id', accountId)
    return assignments.flatMap((assignment) =>
      assignment.roleVersion.permissions.map((membership) =>
        this.grant(assignment, membership.permissionKey, assignment.scopeOrgUnitId)
      )
    )
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

  /** Derives lifecycle and current-effectiveness state without rewriting assignment history. */
  state(assignment: RoleAssignment, now: DateTime = DateTime.now()): RoleAssignmentState {
    let status: RoleAssignmentStatus

    if (assignment.termination && assignment.termination.effectiveAt <= now) {
      status = assignment.termination.kind as RoleAssignmentStatus
    } else if (assignment.startsAt > now) {
      status = 'UPCOMING'
    } else if (assignment.expiresAt && assignment.expiresAt <= now) {
      status = 'EXPIRED'
    } else {
      status = 'ACTIVE'
    }

    const ineffectiveReasons: RoleAssignmentIneffectiveReason[] = []
    if (assignment.account.status !== 'ACTIVE') ineffectiveReasons.push('ACCOUNT_NOT_ACTIVE')
    if (assignment.roleVersion.role.archivedAt) ineffectiveReasons.push('ROLE_ARCHIVED')
    if (assignment.scopeOrgUnit.archivedAt) ineffectiveReasons.push('SCOPE_ARCHIVED')
    if (status === 'UPCOMING') ineffectiveReasons.push('NOT_STARTED')
    if (status === 'EXPIRED') ineffectiveReasons.push('EXPIRED')
    if (['ENDED', 'CANCELLED', 'REPLACED'].includes(status)) {
      ineffectiveReasons.push('TERMINATED')
    }

    return {
      status,
      effectiveNow: status === 'ACTIVE' && ineffectiveReasons.length === 0,
      ineffectiveReasons,
    }
  }
}
