import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import InvalidDelegationChangeException from '#exceptions/invalid_delegation_change_exception'
import Delegation from '#models/delegation'
import DelegationResponse from '#models/delegation_response'
import AccessEventService from '#services/access_event_service'
import AccessRootAuthorityService from '#services/access_root_authority_service'
import DelegationScopeCompatibilityService from '#services/delegation_scope_compatibility_service'
import EffectiveAccessService from '#services/effective_access_service'
import type { RequestAuditContext } from '#types/access'
import type { DelegationResponseKind } from '#types/delegation'
import type { acceptDelegationValidator, rejectDelegationValidator } from '#validators/delegation'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { Infer } from '@vinejs/vine/types'

type AcceptData = Infer<typeof acceptDelegationValidator>
type RejectData = Infer<typeof rejectDelegationValidator>

@inject()
export default class DelegationResponseService {
  constructor(
    private rootAuthority: AccessRootAuthorityService,
    private scopeCompatibility: DelegationScopeCompatibilityService,
    private effectiveAccess: EffectiveAccessService,
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

  private assertRespondable(delegation: Delegation, actorAccountId: string, now: DateTime) {
    if (delegation.delegateAccountId !== actorAccountId) {
      this.invalid('Only the proposed delegate may respond to this delegation.')
    }
    if (delegation.response) {
      this.invalid('This delegation proposal has already received a response.')
    }
    if (delegation.termination) {
      this.invalid('This delegation proposal has already been terminated.')
    }
    if (now >= delegation.expiresAt) {
      this.invalid('An expired delegation proposal can no longer receive a response.')
    }
  }

  private async assertSourcesRemainEffective(
    delegation: Delegation,
    now: DateTime,
    trx: TransactionClientContract
  ) {
    const sourceIds = delegation.assignments.map(({ sourceAssignmentId }) => sourceAssignmentId)
    const effectiveSources = await this.effectiveAccess
      .effectiveAssignments(trx, now)
      .whereIn('id', sourceIds)
      .where('account_id', delegation.delegatorAccountId)

    if (effectiveSources.length !== sourceIds.length) {
      this.invalid('The delegation cannot be accepted because a source is no longer effective.')
    }
    return effectiveSources
  }

  private async respond(
    delegationId: string,
    actorAccountId: string,
    kind: DelegationResponseKind,
    reason: string | undefined,
    request?: RequestAuditContext
  ) {
    return db.transaction(async (trx) => {
      const now = DateTime.now()
      const actor = await this.rootAuthority.lockAdministrationActor(trx, actorAccountId)
      if (actor.status !== 'ACTIVE') {
        this.invalid('Only an active account may respond to a delegation.')
      }

      const delegation = await this.lockDelegation(trx, delegationId)
      this.assertRespondable(delegation, actor.id, now)
      if (kind === 'ACCEPTED') {
        const sources = await this.assertSourcesRemainEffective(delegation, now, trx)
        const compatibleSources = await this.scopeCompatibility.compatibleSources(
          sources,
          actor.id,
          delegation.expiresAt,
          trx,
          now
        )
        if (compatibleSources.length !== sources.length) {
          this.invalid(
            'The delegation cannot be accepted because the delegate no longer has compatible direct organizational authority through its expiry.'
          )
        }
      }

      const response = await DelegationResponse.create(
        {
          delegationId: delegation.id,
          kind,
          respondedByAccountId: actor.id,
          reason: reason ?? null,
        },
        { client: trx }
      )
      await this.accessEvents.record(
        {
          eventType: kind === 'ACCEPTED' ? 'DELEGATION_ACCEPTED' : 'DELEGATION_REJECTED',
          actorType: 'ACCOUNT',
          actorAccountId: actor.id,
          targetType: 'DELEGATION',
          targetId: delegation.id,
          reason,
          request,
          metadata: {
            delegatorAccountId: delegation.delegatorAccountId,
            sourceAssignmentIds: delegation.assignments.map(
              ({ sourceAssignmentId }) => sourceAssignmentId
            ),
            startsAt: delegation.startsAt.toISO(),
            expiresAt: delegation.expiresAt.toISO(),
          },
        },
        trx
      )
      return response
    })
  }

  /** Accepts a whole proposal before expiry; authority still waits for its scheduled start. */
  accept(
    delegationId: string,
    data: AcceptData,
    actorAccountId: string,
    request?: RequestAuditContext
  ) {
    return this.respond(delegationId, actorAccountId, 'ACCEPTED', data.reason, request)
  }

  /** Rejects a whole proposal with a mandatory reason. */
  reject(
    delegationId: string,
    data: RejectData,
    actorAccountId: string,
    request?: RequestAuditContext
  ) {
    return this.respond(delegationId, actorAccountId, 'REJECTED', data.reason, request)
  }
}
