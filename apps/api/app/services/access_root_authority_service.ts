import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import AccessAuthorityChangedException from '#exceptions/access_authority_changed_exception'
import LastRootAccessException from '#exceptions/last_root_access_exception'
import Permission from '#models/permission'
import RoleAssignment from '#models/role_assignment'
import UserAccount from '#models/user_account'
import EffectiveAccessService from '#services/effective_access_service'
import RoleAssignmentLifecycleService from '#services/role_assignment_lifecycle_service'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

@inject()
export default class AccessRootAuthorityService {
  constructor(
    private effectiveAccess: EffectiveAccessService,
    private assignmentLifecycle: RoleAssignmentLifecycleService
  ) {}

  private lockAccount(trx: TransactionClientContract, accountId: string) {
    return UserAccount.query({ client: trx }).where('id', accountId).forUpdate().firstOrFail()
  }

  private effectiveAssignments(client?: TransactionClientContract, now: DateTime = DateTime.now()) {
    return this.effectiveAccess
      .effectiveAssignments(client, now)
      .where('scope_mode', 'INCLUDE_DESCENDANTS')
      .whereHas('scopeOrgUnit', (builder) => {
        builder.where('unit_type', 'INSTITUTE')
      })
      .whereHas('roleVersion', (builder) => {
        builder.whereHas('permissions', (permissionBuilder) => {
          permissionBuilder.where('permission_key', 'access.root')
        })
      })
  }

  private rootCoverageAssignments(trx: TransactionClientContract, now: DateTime) {
    return RoleAssignment.query({ client: trx })
      .where((builder) => {
        builder.whereNull('expires_at').orWhere('expires_at', '>', now.toJSDate())
      })
      .whereHas('account', (builder) => {
        builder.where('status', 'ACTIVE')
      })
      .whereHas('scopeOrgUnit', (builder) => {
        builder.where('unit_type', 'INSTITUTE').whereNull('archived_at')
      })
      .whereHas('roleVersion', (builder) => {
        builder
          .whereHas('role', (roleBuilder) => {
            roleBuilder.whereNull('archived_at')
          })
          .whereHas('permissions', (permissionBuilder) => {
            permissionBuilder.where('permission_key', 'access.root')
          })
      })
      .where('scope_mode', 'INCLUDE_DESCENDANTS')
      .preload('termination')
      .orderBy('starts_at', 'asc')
      .orderBy('id', 'asc')
  }

  /** Locks the stable root permission row shared by every access-authority mutation. */
  async lockMutations(trx: TransactionClientContract) {
    await Permission.query({ client: trx }).where('key', 'access.root').forUpdate().firstOrFail()
  }

  /** Serializes a root write and locks both its actor and target accounts. */
  async lockAdministrationAccounts(
    trx: TransactionClientContract,
    actorAccountId: string,
    targetAccountId: string
  ) {
    await this.lockMutations(trx)

    const actor = await this.lockAccount(trx, actorAccountId)
    const target =
      targetAccountId === actorAccountId ? actor : await this.lockAccount(trx, targetAccountId)

    return { actor, target }
  }

  /** Serializes a root-authorized write and locks its acting account for transactional revalidation. */
  async lockAdministrationActor(trx: TransactionClientContract, actorAccountId: string) {
    await this.lockMutations(trx)
    return this.lockAccount(trx, actorAccountId)
  }

  /** Rejects a locked actor whose root assignment is no longer effective in the transaction. */
  async assertEffectiveActor(
    actor: UserAccount,
    trx: TransactionClientContract,
    now: DateTime<true>
  ) {
    const assignment =
      actor.status === 'ACTIVE'
        ? await this.effectiveAssignments(trx, now).where('account_id', actor.id).first()
        : null
    if (!assignment) {
      throw new AccessAuthorityChangedException()
    }

    return assignment
  }

  /** Determines whether an account currently holds effective institution-wide root authority. */
  async isEffective(
    accountId: string,
    client?: TransactionClientContract,
    now: DateTime = DateTime.now()
  ) {
    const assignment = await this.effectiveAssignments(client, now)
      .where('account_id', accountId)
      .first()

    return Boolean(assignment)
  }

  /** Determines whether another active account currently preserves root authority. */
  async hasOtherEffective(
    excludedAccountId: string,
    client: TransactionClientContract,
    now: DateTime = DateTime.now()
  ) {
    const assignment = await this.effectiveAssignments(client, now)
      .whereNot('account_id', excludedAccountId)
      .first()

    return Boolean(assignment)
  }

  /**
   * Verifies that committed and scheduled root grants cover the present continuously.
   * A finite chain must ultimately reach an open-ended effective root assignment.
   */
  async assertContinuousCoverage(trx: TransactionClientContract, now: DateTime = DateTime.now()) {
    const assignments = await this.rootCoverageAssignments(trx, now)
    const intervals = assignments
      .map((assignment) => {
        return {
          startsAt: assignment.startsAt,
          endsAt: this.assignmentLifecycle.effectiveEnd(assignment),
        }
      })
      .filter(({ startsAt, endsAt }) => !endsAt || startsAt < endsAt)
      .sort((left, right) => left.startsAt.toMillis() - right.startsAt.toMillis())

    let coveredUntil: number | undefined

    for (const interval of intervals) {
      if (interval.endsAt && interval.endsAt <= now) {
        continue
      }

      if (coveredUntil === undefined) {
        if (interval.startsAt > now) {
          throw new LastRootAccessException()
        }
        if (!interval.endsAt) return
        coveredUntil = interval.endsAt.toMillis()
        continue
      }

      if (interval.startsAt.toMillis() > coveredUntil) {
        throw new LastRootAccessException()
      }

      if (!interval.endsAt) {
        return
      }
      if (interval.endsAt.toMillis() > coveredUntil) {
        coveredUntil = interval.endsAt.toMillis()
      }
    }

    throw new LastRootAccessException()
  }
}
