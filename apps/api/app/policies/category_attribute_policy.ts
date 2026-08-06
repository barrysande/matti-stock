import { inject } from '@adonisjs/core'
import { BasePolicy } from '@adonisjs/bouncer'
import type UserAccount from '#models/user_account'
import CatalogueAuthorityService from '#services/catalogue_authority_service'

@inject()
export default class CategoryAttributePolicy extends BasePolicy {
  constructor(private catalogueAuthority: CatalogueAuthorityService) {
    super()
  }

  list() {
    return true
  }

  view() {
    return true
  }

  create(account: UserAccount) {
    return this.catalogueAuthority.isEffective(account.id)
  }

  updateDetails(account: UserAccount) {
    return this.catalogueAuthority.isEffective(account.id)
  }

  updateSemantics(account: UserAccount) {
    return this.catalogueAuthority.isEffective(account.id)
  }

  addChoice(account: UserAccount) {
    return this.catalogueAuthority.isEffective(account.id)
  }

  updateChoice(account: UserAccount) {
    return this.catalogueAuthority.isEffective(account.id)
  }

  reorderChoices(account: UserAccount) {
    return this.catalogueAuthority.isEffective(account.id)
  }

  archiveChoice(account: UserAccount) {
    return this.catalogueAuthority.isEffective(account.id)
  }

  restoreChoice(account: UserAccount) {
    return this.catalogueAuthority.isEffective(account.id)
  }

  archive(account: UserAccount) {
    return this.catalogueAuthority.isEffective(account.id)
  }

  restore(account: UserAccount) {
    return this.catalogueAuthority.isEffective(account.id)
  }
}
