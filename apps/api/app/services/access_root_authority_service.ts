import { DateTime } from 'luxon'
import AccessAuthorityChangedException from '#exceptions/access_authority_changed_exception'
import Permission from '#models/permission'
import RoleAssignment from '#models/role_assignment'
import UserAccount from '#models/user_account'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export default class AccessRootAuthorityService {
  private lockAccount(trx: TransactionClientContract, accountId: string) {
    return UserAccount.query({ client: trx }).where('id', accountId).forUpdate().firstOrFail()
  }

  private effectiveAssignments(client?: TransactionClientContract, now: DateTime = DateTime.now()) {
    const query = client ? RoleAssignment.query({ client }) : RoleAssignment.query()

    return query
      .where('scope_mode', 'INCLUDE_DESCENDANTS')
      .where('starts_at', '<=', now.toJSDate())
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
  }

  async lockMutations(trx: TransactionClientContract) {
    await Permission.query({ client: trx }).where('key', 'access.root').forUpdate().firstOrFail()
  }

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

  async assertEffectiveActor(
    actor: UserAccount,
    trx: TransactionClientContract,
    now: DateTime<true>
  ) {
    if (actor.status !== 'ACTIVE' || !(await this.isEffective(actor.id, trx, now))) {
      throw new AccessAuthorityChangedException()
    }
  }

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
}
