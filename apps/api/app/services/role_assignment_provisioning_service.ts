import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import InvalidRoleAssignmentChangeException from '#exceptions/invalid_role_assignment_change_exception'
import OrganizationalUnit from '#models/organizational_unit'
import Role from '#models/role'
import RoleAssignment from '#models/role_assignment'
import RoleVersion from '#models/role_version'
import UserAccount from '#models/user_account'
import AccessEventService from '#services/access_event_service'
import AccessRootAuthorityService from '#services/access_root_authority_service'
import RoleAssignmentLifecycleService from '#services/role_assignment_lifecycle_service'
import type { RequestAuditContext } from '#types/access'
import type { createRoleAssignmentValidator } from '#validators/role_assignment'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { Infer } from '@vinejs/vine/types'

type CreateData = Infer<typeof createRoleAssignmentValidator>

@inject()
export default class RoleAssignmentProvisioningService {
  constructor(
    private rootAuthority: AccessRootAuthorityService,
    private assignmentLifecycle: RoleAssignmentLifecycleService,
    private accessEvents: AccessEventService
  ) {}

  private invalid(message: string): never {
    throw new InvalidRoleAssignmentChangeException(message)
  }

  private resolveInterval(data: CreateData, now: DateTime<true>) {
    if (data.startMode === 'NOW' && data.startsAt) {
      this.invalid('A startsAt value cannot be supplied when an assignment starts now.')
    }
    if (data.startMode === 'SCHEDULED' && !data.startsAt) {
      this.invalid('An exact startsAt value is required for a scheduled assignment.')
    }

    const startsAt = data.startMode === 'NOW' ? now : data.startsAt!
    if (data.startMode === 'SCHEDULED' && startsAt <= now) {
      this.invalid('A scheduled assignment must start in the future.')
    }

    const expiresAt = data.expiresAt ?? null
    if (expiresAt && expiresAt <= startsAt) {
      this.invalid('The assignment expiry must be later than its start time.')
    }

    return { startsAt, expiresAt }
  }

  private async lockTargetAccount(
    data: CreateData,
    actor: UserAccount,
    trx: TransactionClientContract
  ) {
    const account =
      data.accountId === actor.id
        ? actor
        : await UserAccount.query({ client: trx })
            .where('id', data.accountId)
            .forUpdate()
            .firstOrFail()

    if (!['INVITED', 'ACTIVE'].includes(account.status)) {
      this.invalid('Roles may be assigned only to invited or active accounts.')
    }
    return account
  }

  private async lockRoleVersion(data: CreateData, trx: TransactionClientContract) {
    const role = await Role.query({ client: trx })
      .where('id', data.roleId)
      .forUpdate()
      .firstOrFail()
    if (role.archivedAt) {
      this.invalid('An archived role cannot receive new assignments.')
    }

    const roleVersion = await RoleVersion.query({ client: trx })
      .where('role_id', role.id)
      .preload('permissions')
      .orderBy('version', 'desc')
      .forUpdate()
      .firstOrFail()
    return { role, roleVersion }
  }

  private async lockScope(data: CreateData, trx: TransactionClientContract) {
    const scope = await OrganizationalUnit.query({ client: trx })
      .where('id', data.scopeOrganizationalUnitId)
      .forUpdate()
      .firstOrFail()
    if (scope.archivedAt) {
      this.invalid('An archived organizational unit cannot receive new assignments.')
    }
    return scope
  }

  private assertRootScope(
    role: Role,
    roleVersion: RoleVersion,
    scope: OrganizationalUnit,
    data: CreateData
  ) {
    const grantsRoot = roleVersion.permissions.some(
      (membership) => membership.permissionKey === 'access.root'
    )
    if (!grantsRoot) {
      return
    }

    if (
      role.key !== 'MASTER_ADMIN' ||
      !role.systemManaged ||
      scope.unitType !== 'INSTITUTE' ||
      data.scopeMode !== 'INCLUDE_DESCENDANTS'
    ) {
      this.invalid(
        'Root access may be assigned only through MASTER_ADMIN at the institute with descendant scope.'
      )
    }
  }

  private async assertNoOverlap(
    data: CreateData,
    roleId: string,
    startsAt: DateTime,
    expiresAt: DateTime | null,
    trx: TransactionClientContract,
    excludedAssignmentId?: string
  ) {
    const query = RoleAssignment.query({ client: trx })
      .where('account_id', data.accountId)
      .where('scope_org_unit_id', data.scopeOrganizationalUnitId)
      .where('scope_mode', data.scopeMode)
      .whereHas('roleVersion', (builder) => {
        builder.where('role_id', roleId)
      })
      .preload('termination')
      .forUpdate()

    if (excludedAssignmentId) {
      query.whereNot('id', excludedAssignmentId)
    }

    const assignments = await query
    const overlaps = assignments.some((assignment) => {
      const existingEndsAt = this.assignmentLifecycle.effectiveEnd(assignment)

      return (
        (!expiresAt || assignment.startsAt < expiresAt) &&
        (!existingEndsAt || startsAt < existingEndsAt)
      )
    })

    if (overlaps) {
      this.invalid(
        'This account already has overlapping authority for the selected role and scope.'
      )
    }
  }

  /**
   * Creates a grant inside an existing serialized root transaction.
   * Callers supply the root assignment that authorized the enclosing command.
   */
  async createWithinTransaction(
    data: CreateData,
    actor: UserAccount,
    authorityAssignmentId: string,
    trx: TransactionClientContract,
    request?: RequestAuditContext,
    options: { excludedAssignmentId?: string; recordEvent?: boolean } = {}
  ) {
    const now = DateTime.now()
    const { startsAt, expiresAt } = this.resolveInterval(data, now)
    const account = await this.lockTargetAccount(data, actor, trx)
    const { role, roleVersion } = await this.lockRoleVersion(data, trx)
    const scope = await this.lockScope(data, trx)
    this.assertRootScope(role, roleVersion, scope, data)
    await this.assertNoOverlap(
      data,
      role.id,
      startsAt,
      expiresAt,
      trx,
      options.excludedAssignmentId
    )

    const assignment = await RoleAssignment.create(
      {
        accountId: account.id,
        roleVersionId: roleVersion.id,
        scopeOrgUnitId: scope.id,
        scopeMode: data.scopeMode,
        startsAt,
        expiresAt,
        grantedByAccountId: actor.id,
        reason: data.reason,
      },
      { client: trx }
    )

    if (options.recordEvent !== false) {
      await this.accessEvents.record(
        {
          eventType: 'ROLE_ASSIGNMENT_GRANTED',
          actorType: 'ACCOUNT',
          actorAccountId: actor.id,
          targetType: 'ROLE_ASSIGNMENT',
          targetId: assignment.id,
          reason: data.reason,
          request,
          metadata: {
            authorityAssignmentId,
            effectivePermission: 'access.root',
            accountId: account.id,
            roleId: role.id,
            roleVersionId: roleVersion.id,
            roleVersion: Number(roleVersion.version),
            scopeOrganizationalUnitId: scope.id,
            scopeMode: assignment.scopeMode,
            startsAt: startsAt.toISO(),
            expiresAt: expiresAt?.toISO() ?? null,
          },
        },
        trx
      )
    }

    return assignment
  }

  /** Grants the latest version of an active reusable role at an approved organizational scope. */
  async create(data: CreateData, actorAccountId: string, request?: RequestAuditContext) {
    return db.transaction(async (trx) => {
      const now = DateTime.now()
      const actor = await this.rootAuthority.lockAdministrationActor(trx, actorAccountId)
      const authority = await this.rootAuthority.assertEffectiveActor(actor, trx, now)
      const assignment = await this.createWithinTransaction(data, actor, authority.id, trx, request)
      await this.rootAuthority.assertContinuousCoverage(trx, now)
      return assignment
    })
  }
}
