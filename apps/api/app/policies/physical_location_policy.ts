import { inject } from '@adonisjs/core'
import { BasePolicy } from '@adonisjs/bouncer'
import AccessRootAuthorityService from '#services/access_root_authority_service'
import type UserAccount from '#models/user_account'

@inject()
export default class PhysicalLocationPolicy extends BasePolicy {
  constructor(private rootAuthority: AccessRootAuthorityService) {
    super()
  }

  private canManageLocations(account: UserAccount) {
    return this.rootAuthority.isEffective(account.id)
  }

  list(account: UserAccount) {
    return this.canManageLocations(account)
  }

  view(account: UserAccount) {
    return this.canManageLocations(account)
  }

  create(account: UserAccount) {
    return this.canManageLocations(account)
  }

  rename(account: UserAccount) {
    return this.canManageLocations(account)
  }

  reparent(account: UserAccount) {
    return this.canManageLocations(account)
  }

  archive(account: UserAccount) {
    return this.canManageLocations(account)
  }

  restore(account: UserAccount) {
    return this.canManageLocations(account)
  }
}
