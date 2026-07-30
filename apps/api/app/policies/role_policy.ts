import { inject } from '@adonisjs/core'
import { BasePolicy } from '@adonisjs/bouncer'
import AccessRootAuthorityService from '#services/access_root_authority_service'
import type UserAccount from '#models/user_account'

@inject()
export default class RolePolicy extends BasePolicy {
  constructor(private rootAuthority: AccessRootAuthorityService) {
    super()
  }

  private canManageRoles(account: UserAccount) {
    return this.rootAuthority.isEffective(account.id)
  }

  listPermissions(account: UserAccount) {
    return this.canManageRoles(account)
  }

  list(account: UserAccount) {
    return this.canManageRoles(account)
  }

  view(account: UserAccount) {
    return this.canManageRoles(account)
  }

  create(account: UserAccount) {
    return this.canManageRoles(account)
  }

  rename(account: UserAccount) {
    return this.canManageRoles(account)
  }

  replacePermissions(account: UserAccount) {
    return this.canManageRoles(account)
  }

  archive(account: UserAccount) {
    return this.canManageRoles(account)
  }

  restore(account: UserAccount) {
    return this.canManageRoles(account)
  }
}
