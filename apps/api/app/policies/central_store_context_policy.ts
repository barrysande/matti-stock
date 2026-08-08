import { inject } from '@adonisjs/core'
import { BasePolicy } from '@adonisjs/bouncer'
import type UserAccount from '#models/user_account'
import AccessRootAuthorityService from '#services/access_root_authority_service'
import CentralStoreAuthorityService from '#services/central_store_authority_service'

@inject()
export default class CentralStoreContextPolicy extends BasePolicy {
  constructor(
    private rootAuthority: AccessRootAuthorityService,
    private storeAuthority: CentralStoreAuthorityService
  ) {
    super()
  }

  async view(account: UserAccount) {
    return (
      (await this.rootAuthority.isEffective(account.id)) ||
      (await this.storeAuthority.isEffective(account.id))
    )
  }

  viewHistory(account: UserAccount) {
    return this.rootAuthority.isEffective(account.id)
  }

  configure(account: UserAccount) {
    return this.rootAuthority.isEffective(account.id)
  }
}
