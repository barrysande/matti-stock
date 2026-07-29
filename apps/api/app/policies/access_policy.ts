import { inject } from '@adonisjs/core'
import { BasePolicy } from '@adonisjs/bouncer'
import AccessRootAuthorityService from '#services/access_root_authority_service'
import type UserAccount from '#models/user_account'

@inject()
export default class AccessPolicy extends BasePolicy {
  constructor(private rootAuthority: AccessRootAuthorityService) {
    super()
  }

  private async canManageAccess(account: UserAccount) {
    return this.rootAuthority.isEffective(account.id)
  }

  createAccount(account: UserAccount) {
    return this.canManageAccess(account)
  }

  resetPassword(account: UserAccount) {
    return this.canManageAccess(account)
  }

  list(account: UserAccount) {
    return this.canManageAccess(account)
  }

  view(account: UserAccount) {
    return this.canManageAccess(account)
  }

  suspend(account: UserAccount) {
    return this.canManageAccess(account)
  }

  restore(account: UserAccount) {
    return this.canManageAccess(account)
  }

  deactivate(account: UserAccount) {
    return this.canManageAccess(account)
  }

  reactivate(account: UserAccount) {
    return this.canManageAccess(account)
  }
}
