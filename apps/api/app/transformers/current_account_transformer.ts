import { BaseTransformer } from '@adonisjs/core/transformers'
import type UserAccount from '#models/user_account'
import type Person from '#models/person'
import type { EffectiveAccessGrant } from '#types/role_assignment'

interface CurrentAccountResource {
  account: UserAccount
  person: Person
  grants: EffectiveAccessGrant[]
}

export default class CurrentAccountTransformer extends BaseTransformer<CurrentAccountResource> {
  toObject() {
    const permissionKeys = [
      ...new Set(this.resource.grants.map(({ permissionKey }) => permissionKey)),
    ].sort()
    const assignments = new Map<string, EffectiveAccessGrant[]>()
    for (const grant of this.resource.grants) {
      assignments.set(grant.assignmentId, [...(assignments.get(grant.assignmentId) ?? []), grant])
    }

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
      effectivePermissionKeys: permissionKeys,
      roleAssignments: [...assignments.values()].map((grants) => {
        const first = grants[0]!
        return {
          id: first.assignmentId,
          role: {
            id: first.roleId,
            key: first.roleKey,
            name: first.roleName,
            versionId: first.roleVersionId,
            version: first.roleVersion,
          },
          permissionKeys: grants.map(({ permissionKey }) => permissionKey).sort(),
          scope: {
            organizationalUnitId: first.declaredScopeOrganizationalUnitId,
            mode: first.scopeMode,
          },
        }
      }),
    }
  }
}
