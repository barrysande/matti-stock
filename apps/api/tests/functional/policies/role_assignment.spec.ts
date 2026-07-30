import { test } from '@japa/runner'
import type UserAccount from '#models/user_account'
import RoleAssignmentPolicy from '#policies/role_assignment_policy'
import type AccessRootAuthorityService from '#services/access_root_authority_service'

const actions = ['list', 'view', 'create', 'end', 'cancel', 'replace'] as const

function policyFor(effectiveAccountId: string | null) {
  const rootAuthority = {
    isEffective: async (accountId: string) => accountId === effectiveAccountId,
  } as unknown as AccessRootAuthorityService

  return new RoleAssignmentPolicy(rootAuthority)
}

test.group('Role assignment policy', () => {
  test('allows every action only through effective access.root authority', async ({ assert }) => {
    const root = { id: 'root-account' } as UserAccount
    const ordinary = { id: 'ordinary-account', status: 'ACTIVE' } as UserAccount
    const policy = policyFor(root.id)

    for (const action of actions) {
      assert.isTrue(await policy[action](root))
      assert.isFalse(await policy[action](ordinary))
    }
  })

  test('does not use account status or role naming as an authorization shortcut', async ({
    assert,
  }) => {
    const namedMaster = {
      id: 'named-master-without-effective-root',
      status: 'ACTIVE',
    } as UserAccount
    const policy = policyFor(null)

    for (const action of actions) {
      assert.isFalse(await policy[action](namedMaster))
    }
  })
})
