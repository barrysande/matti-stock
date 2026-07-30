import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import InvalidDelegationChangeException from '#exceptions/invalid_delegation_change_exception'
import Delegation from '#models/delegation'
import DelegationAssignment from '#models/delegation_assignment'
import AccessEventService from '#services/access_event_service'
import AccessRootAuthorityService from '#services/access_root_authority_service'
import EffectiveAccessService from '#services/effective_access_service'
import RoleAssignmentLifecycleService from '#services/role_assignment_lifecycle_service'
import type { RequestAuditContext } from '#types/access'
import type { DelegationInterval } from '#types/delegation'
import type { createDelegationValidator } from '#validators/delegation'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { Infer } from '@vinejs/vine/types'

type CreateData = Infer<typeof createDelegationValidator>

@inject()
export default class DelegationProvisioningService {
  constructor(
    private rootAuthority: AccessRootAuthorityService,
    private effectiveAccess: EffectiveAccessService,
    private assignmentLifecycle: RoleAssignmentLifecycleService,
    private accessEvents: AccessEventService
  ) {}

  private invalid(message: string): never {
    throw new InvalidDelegationChangeException(message)
  }

  private resolveInterval(data: CreateData, now: DateTime<true>): DelegationInterval {
    if (data.startMode === 'NOW' && data.startsAt) {
      this.invalid('A startsAt value cannot be supplied when a delegation starts now.')
    }
    if (data.startMode === 'SCHEDULED' && !data.startsAt) {
      this.invalid('An exact startsAt value is required for a scheduled delegation.')
    }

    const startsAt = data.startMode === 'NOW' ? now : data.startsAt!
    if (data.startMode === 'SCHEDULED' && startsAt <= now) {
      this.invalid('A scheduled delegation must start in the future.')
    }
    if (data.expiresAt <= startsAt) {
      this.invalid('The delegation expiry must be later than its start time.')
    }
    return { startsAt, expiresAt: data.expiresAt }
  }

  private distinctAssignmentIds(assignmentIds: string[]) {
    const distinct = [...new Set(assignmentIds)].sort()
    if (distinct.length !== assignmentIds.length) {
      this.invalid('A source assignment may appear only once in a delegation proposal.')
    }
    return distinct
  }

  private async lockSources(
    assignmentIds: string[],
    actorAccountId: string,
    expiresAt: DateTime,
    now: DateTime,
    trx: TransactionClientContract
  ) {
    const assignments = await this.effectiveAccess
      .effectiveAssignments(trx, now)
      .whereIn('id', assignmentIds)
      .where('account_id', actorAccountId)
      .forUpdate()

    if (assignments.length !== assignmentIds.length) {
      this.invalid('Every source must be a currently effective direct assignment held by you.')
    }

    for (const assignment of assignments) {
      const grantsRoot = assignment.roleVersion.permissions.some(
        ({ permissionKey }) => permissionKey === 'access.root'
      )
      if (grantsRoot || assignment.roleVersion.role.key === 'MASTER_ADMIN') {
        this.invalid('MASTER_ADMIN and access.root authority cannot be delegated.')
      }

      const effectiveEnd = this.assignmentLifecycle.effectiveEnd(assignment)
      if (effectiveEnd && expiresAt > effectiveEnd) {
        this.invalid('A delegation cannot expire after the known end of a source assignment.')
      }
    }
    return assignments
  }

  private async assertNoOverlap(
    assignmentIds: string[],
    interval: DelegationInterval,
    trx: TransactionClientContract
  ) {
    const links = await DelegationAssignment.query({ client: trx })
      .whereIn('source_assignment_id', assignmentIds)
      .preload('delegation', (builder) => {
        builder.preload('response').preload('termination')
      })

    const overlap = links.some(({ delegation }) => {
      const open = delegation.response?.kind !== 'REJECTED' && !delegation.termination
      return (
        open && delegation.startsAt < interval.expiresAt && interval.startsAt < delegation.expiresAt
      )
    })
    if (overlap) {
      this.invalid('A source assignment already has an overlapping pending or accepted delegation.')
    }
  }

  /** Proposes one atomic bundle of complete, currently effective direct assignments. */
  async create(data: CreateData, actorAccountId: string, request?: RequestAuditContext) {
    return db.transaction(async (trx) => {
      const now = DateTime.now()
      const interval = this.resolveInterval(data, now)
      const assignmentIds = this.distinctAssignmentIds(data.assignmentIds)
      const { actor, target: delegate } = await this.rootAuthority.lockAdministrationAccounts(
        trx,
        actorAccountId,
        data.delegateAccountId
      )

      if (actor.id === delegate.id) {
        this.invalid('An account cannot delegate authority to itself.')
      }
      if (actor.status !== 'ACTIVE') {
        this.invalid('Only an active account may propose a delegation.')
      }
      if (delegate.status !== 'ACTIVE') {
        this.invalid('Authority may be delegated only to an active account.')
      }

      const assignments = await this.lockSources(
        assignmentIds,
        actor.id,
        interval.expiresAt,
        now,
        trx
      )
      await this.assertNoOverlap(assignmentIds, interval, trx)

      const delegation = await Delegation.create(
        {
          delegatorAccountId: actor.id,
          delegateAccountId: delegate.id,
          startsAt: interval.startsAt,
          expiresAt: interval.expiresAt,
          reason: data.reason,
        },
        { client: trx }
      )
      await DelegationAssignment.createMany(
        assignments.map((assignment) => ({
          delegationId: delegation.id,
          sourceAssignmentId: assignment.id,
        })),
        { client: trx }
      )

      await this.accessEvents.record(
        {
          eventType: 'DELEGATION_PROPOSED',
          actorType: 'ACCOUNT',
          actorAccountId: actor.id,
          targetType: 'DELEGATION',
          targetId: delegation.id,
          reason: data.reason,
          request,
          metadata: {
            delegateAccountId: delegate.id,
            sourceAssignmentIds: assignmentIds,
            startsAt: interval.startsAt.toISO(),
            expiresAt: interval.expiresAt.toISO(),
          },
        },
        trx
      )
      return delegation
    })
  }
}
