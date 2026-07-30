import { inject } from '@adonisjs/core'
import { BasePolicy } from '@adonisjs/bouncer'
import AccessRootAuthorityService from '#services/access_root_authority_service'
import type UserAccount from '#models/user_account'

@inject()
export default class RoleAssignmentPolicy extends BasePolicy {
  constructor(private rootAuthority: AccessRootAuthorityService) {
    super()
  }

  private canManageAssignments(account: UserAccount) {
    return this.rootAuthority.isEffective(account.id)
  }

  list(account: UserAccount) {
    return this.canManageAssignments(account)
  }

  view(account: UserAccount) {
    return this.canManageAssignments(account)
  }

  create(account: UserAccount) {
    return this.canManageAssignments(account)
  }

  end(account: UserAccount) {
    return this.canManageAssignments(account)
  }

  cancel(account: UserAccount) {
    return this.canManageAssignments(account)
  }

  replace(account: UserAccount) {
    return this.canManageAssignments(account)
  }
}
