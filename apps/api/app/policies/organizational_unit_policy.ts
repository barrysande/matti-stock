import { inject } from '@adonisjs/core'
import { BasePolicy } from '@adonisjs/bouncer'
import AccessRootAuthorityService from '#services/access_root_authority_service'
import type UserAccount from '#models/user_account'

@inject()
export default class OrganizationalUnitPolicy extends BasePolicy {
  constructor(private rootAuthority: AccessRootAuthorityService) {
    super()
  }

  private canManageOrganization(account: UserAccount) {
    return this.rootAuthority.isEffective(account.id)
  }

  list(account: UserAccount) {
    return this.canManageOrganization(account)
  }

  view(account: UserAccount) {
    return this.canManageOrganization(account)
  }

  create(account: UserAccount) {
    return this.canManageOrganization(account)
  }

  previewAccessImpact(account: UserAccount) {
    return this.canManageOrganization(account)
  }

  rename(account: UserAccount) {
    return this.canManageOrganization(account)
  }

  reparent(account: UserAccount) {
    return this.canManageOrganization(account)
  }

  archive(account: UserAccount) {
    return this.canManageOrganization(account)
  }

  restore(account: UserAccount) {
    return this.canManageOrganization(account)
  }
}
