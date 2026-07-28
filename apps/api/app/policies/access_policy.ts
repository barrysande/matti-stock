import { DateTime } from 'luxon'
import { BasePolicy } from '@adonisjs/bouncer'
import RoleAssignment from '#models/role_assignment'
import type UserAccount from '#models/user_account'

export default class AccessPolicy extends BasePolicy {
  private async canManageAccess(account: UserAccount) {
    if (account.status !== 'ACTIVE') {
      return false
    }

    const now = DateTime.now().toJSDate()
    const assignment = await RoleAssignment.query()
      .where('account_id', account.id)
      .where('scope_mode', 'INCLUDE_DESCENDANTS')
      .where('starts_at', '<=', now)
      .where((query) => {
        query.whereNull('expires_at').orWhere('expires_at', '>', now)
      })
      .whereHas('account', (query) => {
        query.where('status', 'ACTIVE')
      })
      .whereHas('scopeOrgUnit', (query) => {
        query.where('unit_type', 'INSTITUTE').whereNull('archived_at')
      })
      .whereHas('roleVersion', (query) => {
        query
          .whereHas('role', (roleQuery) => {
            roleQuery.whereNull('archived_at')
          })
          .whereHas('permissions', (permissionQuery) => {
            permissionQuery.where('permission_key', 'access.root')
          })
      })
      .first()

    return Boolean(assignment)
  }

  createAccount(account: UserAccount) {
    return this.canManageAccess(account)
  }

  resetAccountPassword(account: UserAccount) {
    return this.canManageAccess(account)
  }

  suspendAccount(account: UserAccount) {
    return this.canManageAccess(account)
  }

  restoreAccount(account: UserAccount) {
    return this.canManageAccess(account)
  }

  deactivateAccount(account: UserAccount) {
    return this.canManageAccess(account)
  }

  reactivateAccount(account: UserAccount) {
    return this.canManageAccess(account)
  }
}
