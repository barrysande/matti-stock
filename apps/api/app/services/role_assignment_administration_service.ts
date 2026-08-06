import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import InvalidRoleAssignmentChangeException from '#exceptions/invalid_role_assignment_change_exception'
import RoleAssignment from '#models/role_assignment'
import RoleAssignmentTermination from '#models/role_assignment_termination'
import AccessEventService from '#services/access_event_service'
import AccessRootAuthorityService from '#services/access_root_authority_service'
import RoleAssignmentProvisioningService from '#services/role_assignment_provisioning_service'
import RoleAssignmentLifecycleService from '#services/role_assignment_lifecycle_service'
import type { RequestAuditContext } from '#types/access'
import type { RoleAssignmentTerminationKind } from '#types/role_assignment'
import type {
  administerRoleAssignmentValidator,
  replaceRoleAssignmentValidator,
} from '#validators/role_assignment'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { Infer } from '@vinejs/vine/types'

type AdministerData = Infer<typeof administerRoleAssignmentValidator>
type ReplaceData = Infer<typeof replaceRoleAssignmentValidator>

@inject()
export default class RoleAssignmentAdministrationService {
  constructor(
    private rootAuthority: AccessRootAuthorityService,
    private assignmentLifecycle: RoleAssignmentLifecycleService,
    private provisioning: RoleAssignmentProvisioningService,
    private accessEvents: AccessEventService
  ) {}

  private invalid(message: string): never {
    throw new InvalidRoleAssignmentChangeException(message)
  }

  private lockAssignment(trx: TransactionClientContract, assignmentId: string) {
    return RoleAssignment.query({ client: trx })
      .where('id', assignmentId)
      .preload('account', (builder) => {
        builder.preload('person')
      })
      .preload('scopeOrgUnit')
      .preload('termination')
      .preload('roleVersion', (builder) => {
        builder.preload('role').preload('permissions')
      })
      .forUpdate()
      .firstOrFail()
  }

  private assertOpen(assignment: RoleAssignment) {
    if (assignment.termination) {
      this.invalid('The role assignment has already been ended, cancelled, or replaced.')
    }
  }

  private createTermination(
    assignment: RoleAssignment,
    kind: RoleAssignmentTerminationKind,
    effectiveAt: DateTime,
    actorAccountId: string,
    reason: string,
    trx: TransactionClientContract,
    replacementAssignmentId?: string
  ) {
    return RoleAssignmentTermination.create(
      {
        assignmentId: assignment.id,
        kind,
        effectiveAt,
        replacementAssignmentId: replacementAssignmentId ?? null,
        terminatedByAccountId: actorAccountId,
        reason,
      },
      { client: trx }
    )
  }

  private recordTermination(
    assignment: RoleAssignment,
    kind: RoleAssignmentTerminationKind,
    effectiveAt: DateTime,
    actorAccountId: string,
    authorityAssignmentId: string,
    reason: string,
    request: RequestAuditContext | undefined,
    trx: TransactionClientContract,
    replacementAssignmentId?: string
  ) {
    return this.accessEvents.record(
      {
        eventType:
          kind === 'ENDED'
            ? 'ROLE_ASSIGNMENT_ENDED'
            : kind === 'CANCELLED'
              ? 'ROLE_ASSIGNMENT_CANCELLED'
              : 'ROLE_ASSIGNMENT_REPLACED',
        actorType: 'ACCOUNT',
        actorAccountId,
        targetType: 'ROLE_ASSIGNMENT',
        targetId: assignment.id,
        reason,
        request,
        metadata: {
          authorityAssignmentId,
          effectivePermission: 'access.root',
          effectiveAt: effectiveAt.toISO(),
          replacementAssignmentId: replacementAssignmentId ?? null,
        },
      },
      trx
    )
  }

  private async terminate(
    assignmentId: string,
    data: AdministerData,
    actorAccountId: string,
    expectedStatus: 'ACTIVE' | 'UPCOMING',
    kind: 'ENDED' | 'CANCELLED',
    request?: RequestAuditContext
  ) {
    return db.transaction(async (trx) => {
      const now = DateTime.now()
      const actor = await this.rootAuthority.lockAdministrationActor(trx, actorAccountId)
      const authority = await this.rootAuthority.assertEffectiveActor(actor, trx, now)
      const assignment = await this.lockAssignment(trx, assignmentId)

      this.assertOpen(assignment)

      const state = this.assignmentLifecycle.state(assignment, now)

      if (state.status !== expectedStatus) {
        this.invalid(
          expectedStatus === 'ACTIVE'
            ? 'Only a currently active assignment may be ended.'
            : 'Only an upcoming assignment may be cancelled.'
        )
      }

      const termination = await this.createTermination(
        assignment,
        kind,
        now,
        actor.id,
        data.reason,
        trx
      )

      await this.rootAuthority.assertContinuousCoverage(trx, now)
      await this.recordTermination(
        assignment,
        kind,
        now,
        actor.id,
        authority.id,
        data.reason,
        request,
        trx
      )

      return termination
    })
  }

  /** Atomically supersedes one open assignment with a new latest-version grant. */
  async replace(
    assignmentId: string,
    data: ReplaceData,
    actorAccountId: string,
    request?: RequestAuditContext
  ) {
    return db.transaction(async (trx) => {
      const now = DateTime.now()
      const actor = await this.rootAuthority.lockAdministrationActor(trx, actorAccountId)
      const authority = await this.rootAuthority.assertEffectiveActor(actor, trx, now)
      const assignment = await this.lockAssignment(trx, assignmentId)

      this.assertOpen(assignment)

      const state = this.assignmentLifecycle.state(assignment, now)

      if (!['ACTIVE', 'UPCOMING'].includes(state.status)) {
        this.invalid('Only an active or upcoming assignment may be replaced.')
      }

      const replacement = await this.provisioning.createWithinTransaction(
        data,
        actor,
        authority.id,
        trx,
        request,
        { excludedAssignmentId: assignment.id, recordEvent: false }
      )

      if (assignment.expiresAt && replacement.startsAt >= assignment.expiresAt) {
        this.invalid('A replacement must start before the assignment it replaces expires.')
      }

      await this.createTermination(
        assignment,
        'REPLACED',
        replacement.startsAt,
        actor.id,
        data.reason,
        trx,
        replacement.id
      )
      await this.rootAuthority.assertContinuousCoverage(trx, now)
      await this.recordTermination(
        assignment,
        'REPLACED',
        replacement.startsAt,
        actor.id,
        authority.id,
        data.reason,
        request,
        trx,
        replacement.id
      )

      return replacement
    })
  }

  /** Cancels an upcoming assignment before it can grant authority. */
  cancel(
    assignmentId: string,
    data: AdministerData,
    actorAccountId: string,
    request?: RequestAuditContext
  ) {
    return this.terminate(assignmentId, data, actorAccountId, 'UPCOMING', 'CANCELLED', request)
  }

  /** Ends a currently active assignment immediately while preserving its original grant. */
  end(
    assignmentId: string,
    data: AdministerData,
    actorAccountId: string,
    request?: RequestAuditContext
  ) {
    return this.terminate(assignmentId, data, actorAccountId, 'ACTIVE', 'ENDED', request)
  }
}
