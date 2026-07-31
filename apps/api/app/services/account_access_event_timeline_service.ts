import AccessEvent from '#models/access_event'
import Delegation from '#models/delegation'
import RoleAssignment from '#models/role_assignment'
import UserAccount from '#models/user_account'
import {
  KNOWN_ACCOUNT_ACCESS_EVENT_TYPES,
  accountAccessEventTypesForCategory,
  type AccountAccessEventTargetContext,
} from '#types/access_event'
import type { indexAccountAccessEventsValidator } from '#validators/access_event'
import type { Infer } from '@vinejs/vine/types'

const EVENTS_PER_PAGE = 20
type ListData = Infer<typeof indexAccountAccessEventsValidator>

export default class AccountAccessEventTimelineService {
  private timelineQuery(accountId: string) {
    return AccessEvent.query()
      .leftJoin(
        'role_assignments as timeline_role_assignments',
        'timeline_role_assignments.id',
        'access_events.target_id'
      )
      .leftJoin(
        'delegations as timeline_delegations',
        'timeline_delegations.id',
        'access_events.target_id'
      )
      .where((scope) => {
        scope
          .where((accountEvents) => {
            accountEvents
              .where('access_events.target_type', 'USER_ACCOUNT')
              .where('access_events.target_id', accountId)
          })
          .orWhere((assignmentEvents) => {
            assignmentEvents
              .where('access_events.target_type', 'ROLE_ASSIGNMENT')
              .where('timeline_role_assignments.account_id', accountId)
          })
          .orWhere((delegationEvents) => {
            delegationEvents
              .where('access_events.target_type', 'DELEGATION')
              .where((participant) => {
                participant
                  .where('timeline_delegations.delegator_account_id', accountId)
                  .orWhere('timeline_delegations.delegate_account_id', accountId)
              })
          })
      })
      .select('access_events.*')
      .preload('actorAccount', (accountQuery) => {
        accountQuery.preload('person')
      })
  }

  private roleAssignmentContext(assignment: RoleAssignment): AccountAccessEventTargetContext {
    return {
      kind: 'ROLE_ASSIGNMENT',
      role: {
        id: assignment.roleVersion.role.id,
        key: assignment.roleVersion.role.key,
        name: assignment.roleVersion.role.name,
        versionId: assignment.roleVersion.id,
        version: Number(assignment.roleVersion.version),
      },
      scope: {
        organizationalUnitId: assignment.scopeOrgUnit.id,
        name: assignment.scopeOrgUnit.name,
        unitType: assignment.scopeOrgUnit.unitType,
        mode: assignment.scopeMode,
      },
      startsAt: assignment.startsAt.toISO(),
      expiresAt: assignment.expiresAt?.toISO() ?? null,
    }
  }

  private delegationContext(delegation: Delegation): AccountAccessEventTargetContext {
    return {
      kind: 'DELEGATION',
      delegator: {
        accountId: delegation.delegator.id,
        personId: delegation.delegator.person.id,
        displayName: delegation.delegator.person.displayName,
      },
      delegate: {
        accountId: delegation.delegate.id,
        personId: delegation.delegate.person.id,
        displayName: delegation.delegate.person.displayName,
      },
      startsAt: delegation.startsAt.toISO(),
      expiresAt: delegation.expiresAt.toISO(),
    }
  }

  private async decorateRoleAssignmentTargets(events: AccessEvent[]) {
    const targetIds = [
      ...new Set(
        events
          .filter(({ targetId, targetType }) => targetType === 'ROLE_ASSIGNMENT' && targetId)
          .map(({ targetId }) => targetId!)
      ),
    ]
    if (targetIds.length === 0) return

    const assignments = await RoleAssignment.query()
      .whereIn('id', targetIds)
      .preload('roleVersion', (versionQuery) => {
        versionQuery.preload('role')
      })
      .preload('scopeOrgUnit')
    const contexts = new Map(
      assignments.map((assignment) => [assignment.id, this.roleAssignmentContext(assignment)])
    )
    for (const event of events) {
      if (event.targetType === 'ROLE_ASSIGNMENT' && event.targetId) {
        event.$extras.timelineTarget = contexts.get(event.targetId)
      }
    }
  }

  private async decorateDelegationTargets(events: AccessEvent[]) {
    const targetIds = [
      ...new Set(
        events
          .filter(({ targetId, targetType }) => targetType === 'DELEGATION' && targetId)
          .map(({ targetId }) => targetId!)
      ),
    ]
    if (targetIds.length === 0) return

    const delegations = await Delegation.query()
      .whereIn('id', targetIds)
      .preload('delegator', (accountQuery) => {
        accountQuery.preload('person')
      })
      .preload('delegate', (accountQuery) => {
        accountQuery.preload('person')
      })
    const contexts = new Map(
      delegations.map((delegation) => [delegation.id, this.delegationContext(delegation)])
    )
    for (const event of events) {
      if (event.targetType === 'DELEGATION' && event.targetId) {
        event.$extras.timelineTarget = contexts.get(event.targetId)
      }
    }
  }

  private async decorateTargets(events: AccessEvent[]) {
    await Promise.all([
      this.decorateRoleAssignmentTargets(events),
      this.decorateDelegationTargets(events),
    ])
  }

  private applyFilters(
    query: ReturnType<AccountAccessEventTimelineService['timelineQuery']>,
    data: ListData
  ) {
    if (data.category) {
      const eventTypes = accountAccessEventTypesForCategory(data.category)
      if (eventTypes) query.whereIn('access_events.event_type', [...eventTypes])
      else query.whereNotIn('access_events.event_type', KNOWN_ACCOUNT_ACCESS_EVENT_TYPES)
    }
    if (data.eventType) query.where('access_events.event_type', data.eventType)
  }

  /** Lists direct account, owned assignment, and participated delegation history. */
  async list(accountId: string, data: ListData) {
    await UserAccount.query().where('id', accountId).select('id').firstOrFail()

    const query = this.timelineQuery(accountId)
    this.applyFilters(query, data)
    const events = await query
      .orderBy('access_events.created_at', 'desc')
      .orderBy('access_events.id', 'desc')
      .paginate(data.page ?? 1, EVENTS_PER_PAGE)
    await this.decorateTargets(events.all())
    return events
  }
}
