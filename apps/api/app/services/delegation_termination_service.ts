import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import InvalidDelegationChangeException from '#exceptions/invalid_delegation_change_exception'
import Delegation from '#models/delegation'
import DelegationTermination from '#models/delegation_termination'
import AccessEventService from '#services/access_event_service'
import AccessRootAuthorityService from '#services/access_root_authority_service'
import type { RequestAuditContext } from '#types/access'
import type { DelegationTerminationKind } from '#types/delegation'
import type { terminateDelegationValidator } from '#validators/delegation'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { Infer } from '@vinejs/vine/types'

type TerminateData = Infer<typeof terminateDelegationValidator>

@inject()
export default class DelegationTerminationService {
  constructor(
    private rootAuthority: AccessRootAuthorityService,
    private accessEvents: AccessEventService
  ) {}

  private invalid(message: string): never {
    throw new InvalidDelegationChangeException(message)
  }

  private lockDelegation(trx: TransactionClientContract, delegationId: string) {
    return Delegation.query({ client: trx })
      .where('id', delegationId)
      .preload('response')
      .preload('termination')
      .preload('assignments')
      .forUpdate()
      .firstOrFail()
  }

  private assertOpen(delegation: Delegation, now: DateTime) {
    if (delegation.termination) {
      this.invalid('This delegation has already been terminated.')
    }
    if (delegation.response?.kind === 'REJECTED') {
      this.invalid('A rejected delegation cannot be terminated.')
    }
    if (now >= delegation.expiresAt) {
      this.invalid('An expired delegation cannot be terminated early.')
    }
  }

  private async terminate(
    delegationId: string,
    data: TerminateData,
    actorAccountId: string,
    kind: DelegationTerminationKind,
    request?: RequestAuditContext
  ) {
    return db.transaction(async (trx) => {
      const now = DateTime.now()
      const actor = await this.rootAuthority.lockAdministrationActor(trx, actorAccountId)
      if (actor.status !== 'ACTIVE') {
        this.invalid('Only an active account may terminate a delegation.')
      }

      const delegation = await this.lockDelegation(trx, delegationId)
      this.assertOpen(delegation, now)

      let authorityAssignmentId: string | null = null
      if (kind === 'REVOKED' && delegation.delegatorAccountId !== actor.id) {
        this.invalid('Only the delegator may revoke this delegation.')
      }
      if (kind === 'RELINQUISHED') {
        if (delegation.delegateAccountId !== actor.id) {
          this.invalid('Only the delegate may relinquish this delegation.')
        }
        if (delegation.response?.kind !== 'ACCEPTED') {
          this.invalid('Only an accepted delegation may be relinquished.')
        }
      }
      if (kind === 'ADMINISTRATIVELY_TERMINATED') {
        const authority = await this.rootAuthority.assertEffectiveActor(actor, trx, now)
        authorityAssignmentId = authority.id
      }

      const termination = await DelegationTermination.create(
        {
          delegationId: delegation.id,
          kind,
          effectiveAt: now,
          terminatedByAccountId: actor.id,
          reason: data.reason,
        },
        { client: trx }
      )
      await this.accessEvents.record(
        {
          eventType:
            kind === 'REVOKED'
              ? 'DELEGATION_REVOKED'
              : kind === 'RELINQUISHED'
                ? 'DELEGATION_RELINQUISHED'
                : 'DELEGATION_ADMINISTRATIVELY_TERMINATED',
          actorType: 'ACCOUNT',
          actorAccountId: actor.id,
          targetType: 'DELEGATION',
          targetId: delegation.id,
          reason: data.reason,
          request,
          metadata: {
            authorityAssignmentId,
            delegatorAccountId: delegation.delegatorAccountId,
            delegateAccountId: delegation.delegateAccountId,
            sourceAssignmentIds: delegation.assignments.map(
              ({ sourceAssignmentId }) => sourceAssignmentId
            ),
            effectiveAt: now.toISO(),
          },
        },
        trx
      )
      return termination
    })
  }

  /** Withdraws a pending proposal or revokes accepted authority as its delegator. */
  revoke(
    delegationId: string,
    data: TerminateData,
    actorAccountId: string,
    request?: RequestAuditContext
  ) {
    return this.terminate(delegationId, data, actorAccountId, 'REVOKED', request)
  }

  /** Lets the recipient relinquish a previously accepted delegation. */
  relinquish(
    delegationId: string,
    data: TerminateData,
    actorAccountId: string,
    request?: RequestAuditContext
  ) {
    return this.terminate(delegationId, data, actorAccountId, 'RELINQUISHED', request)
  }

  /** Ends a pending or accepted delegation using current direct access.root authority. */
  administrativelyTerminate(
    delegationId: string,
    data: TerminateData,
    actorAccountId: string,
    request?: RequestAuditContext
  ) {
    return this.terminate(
      delegationId,
      data,
      actorAccountId,
      'ADMINISTRATIVELY_TERMINATED',
      request
    )
  }
}
