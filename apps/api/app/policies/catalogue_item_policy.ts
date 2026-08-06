import { inject } from '@adonisjs/core'
import { BasePolicy } from '@adonisjs/bouncer'
import type UserAccount from '#models/user_account'
import CatalogueAuthorityService from '#services/catalogue_authority_service'

@inject()
export default class CatalogueItemPolicy extends BasePolicy {
  constructor(private catalogueAuthority: CatalogueAuthorityService) {
    super()
  }

  list() {
    return true
  }

  view() {
    return true
  }

  review(account: UserAccount) {
    return this.catalogueAuthority.isEffective(account.id)
  }

  create(account: UserAccount) {
    return this.catalogueAuthority.isEffective(account.id)
  }

  updateDetails(account: UserAccount) {
    return this.catalogueAuthority.isEffective(account.id)
  }

  updateClassification(account: UserAccount) {
    return this.catalogueAuthority.isEffective(account.id)
  }

  updateAttributeValues(account: UserAccount) {
    return this.catalogueAuthority.isEffective(account.id)
  }

  archive(account: UserAccount) {
    return this.catalogueAuthority.isEffective(account.id)
  }

  restore(account: UserAccount) {
    return this.catalogueAuthority.isEffective(account.id)
  }
}
