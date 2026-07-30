import { DateTime } from 'luxon'
import Delegation from '#models/delegation'
import type { EffectiveDelegationLink } from '#types/delegation'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export default class DelegatedAccessQueryService {
  private query(client?: TransactionClientContract) {
    return client ? Delegation.query({ client }) : Delegation.query()
  }

  /**
   * Loads accepted, interval-valid delegation links. Source-assignment effectiveness remains
   * owned by EffectiveAccessService rather than being duplicated in this storage collaborator.
   */
  async effectiveLinksForDelegate(
    delegateAccountId: string,
    client?: TransactionClientContract,
    now: DateTime = DateTime.now()
  ) {
    const delegations = await this.query(client)
      .where('delegate_account_id', delegateAccountId)
      .where('starts_at', '<=', now.toJSDate())
      .where('expires_at', '>', now.toJSDate())
      .whereHas('delegate', (builder) => {
        builder.where('status', 'ACTIVE')
      })
      .whereHas('response', (builder) => {
        builder.where('kind', 'ACCEPTED')
      })
      .whereDoesntHave('termination', (builder) => {
        builder.where('effective_at', '<=', now.toJSDate())
      })
      .preload('assignments')
      .orderBy('starts_at', 'asc')
      .orderBy('id', 'asc')

    return delegations.flatMap((delegation) =>
      delegation.assignments
        .sort((left, right) => left.sourceAssignmentId.localeCompare(right.sourceAssignmentId))
        .map((assignment): EffectiveDelegationLink => ({
          delegation,
          sourceAssignmentId: assignment.sourceAssignmentId,
        }))
    )
  }
}
