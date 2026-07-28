import { BaseTransformer } from '@adonisjs/core/transformers'
import type UserAccount from '#models/user_account'
import type Person from '#models/person'

interface CurrentAccountResource {
  account: UserAccount
  person: Person
  roles: Array<{
    key: string
    name: string
    version: number
    scope_mode: string
    scope_organizational_unit_id: string
  }>
}

export default class CurrentAccountTransformer extends BaseTransformer<CurrentAccountResource> {
  toObject() {
    return {
      account: {
        id: this.resource.account.id,
        email: this.resource.account.email,
        status: this.resource.account.status,
      },
      person: {
        id: this.resource.person.id,
        displayName: this.resource.person.displayName,
      },
      roles: this.resource.roles.map((role) => ({
        key: role.key,
        name: role.name,
        version: role.version,
        scopeMode: role.scope_mode,
        scopeOrganizationalUnitId: role.scope_organizational_unit_id,
      })),
    }
  }
}
