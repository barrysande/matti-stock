import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import Delegation from '#models/delegation'
import AccessRootAuthorityService from '#services/access_root_authority_service'
import RoleAssignmentDirectoryService from '#services/role_assignment_directory_service'
import RoleAssignmentLifecycleService from '#services/role_assignment_lifecycle_service'
import type { DelegationState } from '#types/delegation'
import type { indexDelegationsValidator } from '#validators/delegation'
import type { Infer } from '@vinejs/vine/types'

const DELEGATIONS_PER_PAGE = 20

type ListData = Infer<typeof indexDelegationsValidator>

@inject()
export default class DelegationDirectoryService {
  constructor(
    private rootAuthority: AccessRootAuthorityService,
    private assignmentLifecycle: RoleAssignmentLifecycleService,
    private roleAssignments: RoleAssignmentDirectoryService
  ) {}

  private summaryQuery() {
    return Delegation.query()
      .preload('delegator', (builder) => {
        builder.select('id', 'person_id', 'email', 'status').preload('person', (personBuilder) => {
          personBuilder.select('id', 'display_name')
        })
      })
      .preload('delegate', (builder) => {
        builder.select('id', 'person_id', 'email', 'status').preload('person', (personBuilder) => {
          personBuilder.select('id', 'display_name')
        })
      })
      .preload('response', (builder) => {
        builder.select('id', 'delegation_id', 'kind')
      })
      .preload('termination', (builder) => {
        builder.select('id', 'delegation_id', 'kind', 'effective_at')
      })
      .preload('assignments', (builder) => {
        builder
          .preload('sourceAssignment', (assignmentBuilder) => {
            assignmentBuilder
              .preload('account', (accountBuilder) => {
                accountBuilder.select('id', 'status')
              })
              .preload('scopeOrgUnit', (scopeBuilder) => {
                scopeBuilder.select('id', 'name', 'unit_type', 'archived_at')
              })
              .preload('termination', (terminationBuilder) => {
                terminationBuilder.select('id', 'assignment_id', 'kind', 'effective_at')
              })
              .preload('roleVersion', (versionBuilder) => {
                versionBuilder.select('id', 'role_id', 'version').preload('role', (roleBuilder) => {
                  roleBuilder.select('id', 'key', 'name', 'archived_at')
                })
              })
          })
          .orderBy('source_assignment_id', 'asc')
      })
  }

  private detailQuery() {
    return Delegation.query()
      .preload('delegator', (builder) => {
        builder.preload('person')
      })
      .preload('delegate', (builder) => {
        builder.preload('person')
      })
      .preload('response', (builder) => {
        builder.preload('respondedBy', (accountBuilder) => {
          accountBuilder.preload('person')
        })
      })
      .preload('termination', (builder) => {
        builder.preload('terminatedBy', (accountBuilder) => {
          accountBuilder.preload('person')
        })
      })
      .preload('assignments', (builder) => {
        builder
          .preload('sourceAssignment', (assignmentBuilder) => {
            assignmentBuilder
              .preload('account', (accountBuilder) => {
                accountBuilder.preload('person')
              })
              .preload('grantedByAccount', (accountBuilder) => {
                accountBuilder.preload('person')
              })
              .preload('scopeOrgUnit')
              .preload('termination', (terminationBuilder) => {
                terminationBuilder.preload('terminatedByAccount', (accountBuilder) => {
                  accountBuilder.preload('person')
                })
              })
              .preload('roleVersion', (versionBuilder) => {
                versionBuilder.preload('permissions').preload('role', (roleBuilder) => {
                  roleBuilder.preload('versions', (versionsBuilder) => {
                    versionsBuilder.orderBy('version', 'desc')
                  })
                })
              })
          })
          .orderBy('source_assignment_id', 'asc')
      })
  }

  private participantScope(
    query: ReturnType<DelegationDirectoryService['summaryQuery']>,
    id: string
  ) {
    query.where((builder) => {
      builder.where('delegator_account_id', id).orWhere('delegate_account_id', id)
    })
  }

  private applyStatus(
    query: ReturnType<DelegationDirectoryService['summaryQuery']>,
    status: NonNullable<ListData['status']>,
    now: DateTime
  ) {
    if (['REVOKED', 'RELINQUISHED', 'ADMINISTRATIVELY_TERMINATED'].includes(status)) {
      query.whereHas('termination', (builder) => {
        builder.where('kind', status)
      })

      return
    }

    if (status === 'REJECTED') {
      query
        .whereDoesntHave('termination', () => {})
        .whereHas('response', (builder) => {
          builder.where('kind', 'REJECTED')
        })

      return
    }

    query
      .whereDoesntHave('termination', () => {})
      .whereDoesntHave('response', (builder) => {
        builder.where('kind', 'REJECTED')
      })

    if (status === 'EXPIRED') {
      query.where('expires_at', '<=', now.toJSDate())
    } else {
      query.where('expires_at', '>', now.toJSDate())

      if (status === 'PENDING') {
        query.whereDoesntHave('response', () => {})
      } else {
        query.whereHas('response', (builder) => {
          builder.where('kind', 'ACCEPTED')
        })
        if (status === 'UPCOMING') query.where('starts_at', '>', now.toJSDate())
        if (status === 'ACTIVE') query.where('starts_at', '<=', now.toJSDate())
      }
    }
  }

  private state(delegation: Delegation, now: DateTime): DelegationState {
    let status: DelegationState['status']

    if (delegation.termination) {
      status = delegation.termination.kind as DelegationState['status']
    } else if (delegation.response?.kind === 'REJECTED') {
      status = 'REJECTED'
    } else if (now >= delegation.expiresAt) {
      status = 'EXPIRED'
    } else if (!delegation.response) {
      status = 'PENDING'
    } else if (now < delegation.startsAt) {
      status = 'UPCOMING'
    } else {
      status = 'ACTIVE'
    }

    const delegationEffective = status === 'ACTIVE' && delegation.delegate.status === 'ACTIVE'
    let effectiveItemCount = 0

    for (const assignment of delegation.assignments) {
      const sourceState = assignment.sourceAssignment.$extras.assignmentState as
        { effectiveNow: boolean } | undefined
      const effectiveNow = delegationEffective && Boolean(sourceState?.effectiveNow)

      assignment.$extras.effectiveNow = effectiveNow
      if (effectiveNow) effectiveItemCount += 1
    }

    return {
      status,
      effectiveNow: effectiveItemCount > 0,
      effectiveItemCount,
      totalItemCount: delegation.assignments.length,
    }
  }

  private decorateState(delegations: Delegation[], now: DateTime) {
    for (const delegation of delegations) {
      delegation.$extras.delegationState = this.state(delegation, now)
    }

    return delegations
  }

  private decorateSummary(delegations: Delegation[], now: DateTime) {
    for (const source of delegations.flatMap((delegation) =>
      delegation.assignments.map(({ sourceAssignment }) => sourceAssignment)
    )) {
      source.$extras.assignmentState = this.assignmentLifecycle.state(source, now)
    }

    return this.decorateState(delegations, now)
  }

  private async decorateDetail(delegations: Delegation[], now: DateTime) {
    const sources = delegations.flatMap((delegation) =>
      delegation.assignments.map(({ sourceAssignment }) => sourceAssignment)
    )

    await this.roleAssignments.prepare(sources, now)

    return this.decorateState(delegations, now)
  }

  /** Lists root-visible history or only the authenticated participant's own delegations. */
  async list(data: ListData, actorAccountId: string, now: DateTime = DateTime.now()) {
    const root = await this.rootAuthority.isEffective(actorAccountId, undefined, now)
    const query = this.summaryQuery().orderBy('created_at', 'desc').orderBy('id', 'asc')

    if (!root) this.participantScope(query, actorAccountId)

    const accountId = data.accountId ?? (root ? undefined : actorAccountId)

    if (accountId) {
      if (data.direction === 'INCOMING') query.where('delegate_account_id', accountId)
      else if (data.direction === 'OUTGOING') query.where('delegator_account_id', accountId)
      else {
        query.where((builder) => {
          builder.where('delegator_account_id', accountId).orWhere('delegate_account_id', accountId)
        })
      }
    }

    if (data.status) this.applyStatus(query, data.status, now)

    const delegations = await query.paginate(data.page ?? 1, DELEGATIONS_PER_PAGE)

    this.decorateSummary(delegations.all(), now)

    return delegations
  }

  /** Loads one delegation only for its participants or effective access.root oversight. */
  async findDetails(delegationId: string, actorAccountId: string, now: DateTime = DateTime.now()) {
    const root = await this.rootAuthority.isEffective(actorAccountId, undefined, now)
    const query = this.detailQuery().where('id', delegationId)

    if (!root) this.participantScope(query, actorAccountId)
    const delegation = await query.firstOrFail()

    await this.decorateDetail([delegation], now)

    return delegation
  }

  /** Loads active or upcoming incoming and outgoing coverage for an access overview. */
  async openForAccount(accountId: string, now: DateTime = DateTime.now()) {
    const query = this.summaryQuery()
      .where('expires_at', '>', now.toJSDate())
      .whereDoesntHave('termination', () => {})
      .whereDoesntHave('response', (builder) => {
        builder.where('kind', 'REJECTED')
      })
      .orderBy('starts_at', 'asc')
      .orderBy('id', 'asc')

    this.participantScope(query, accountId)
    const delegations = await query

    this.decorateSummary(delegations, now)

    return {
      incoming: delegations.filter(({ delegateAccountId }) => delegateAccountId === accountId),
      outgoing: delegations.filter(({ delegatorAccountId }) => delegatorAccountId === accountId),
    }
  }
}
