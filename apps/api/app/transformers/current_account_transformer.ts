import { BaseTransformer } from '@adonisjs/core/transformers'
import type UserAccount from '#models/user_account'
import type Person from '#models/person'
import type { EffectiveAccessGrant } from '#types/role_assignment'

interface CurrentAccountResource {
  account: UserAccount
  person: Person
  grants: EffectiveAccessGrant[]
  canManageCatalogue: boolean
}

export default class CurrentAccountTransformer extends BaseTransformer<CurrentAccountResource> {
  toObject() {
    const permissionKeys = [
      ...new Set(this.resource.grants.map(({ permissionKey }) => permissionKey)),
    ].sort()
    const assignments = new Map<string, EffectiveAccessGrant[]>()
    const delegations = new Map<string, EffectiveAccessGrant[]>()
    for (const grant of this.resource.grants.filter(
      ({ evidenceType }) => evidenceType === 'DIRECT'
    )) {
      assignments.set(grant.assignmentId, [...(assignments.get(grant.assignmentId) ?? []), grant])
    }
    for (const grant of this.resource.grants.filter(
      ({ evidenceType }) => evidenceType === 'DELEGATED'
    )) {
      const key = `${grant.delegationId}:${grant.assignmentId}`
      delegations.set(key, [...(delegations.get(key) ?? []), grant])
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
      canManageCatalogue: this.resource.canManageCatalogue,
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
      delegatedRoleAssignments: [...delegations.values()].map((grants) => {
        const first = grants[0]!
        return {
          delegationId: first.delegationId!,
          sourceAssignmentId: first.assignmentId,
          delegatorAccountId: first.delegatorAccountId!,
          delegateAccountId: first.delegateAccountId!,
          startsAt: first.delegation!.startsAt,
          expiresAt: first.delegation!.expiresAt,
          reason: first.delegation!.reason,
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
