import { test } from '@japa/runner'
import type UserAccount from '#models/user_account'
import OrganizationalUnitPolicy from '#policies/organizational_unit_policy'
import type AccessRootAuthorityService from '#services/access_root_authority_service'

const actions = [
  'list',
  'view',
  'create',
  'previewAccessImpact',
  'rename',
  'reparent',
  'archive',
  'restore',
] as const

function policyFor(effectiveAccountId: string | null) {
  const rootAuthority = {
    isEffective: async (accountId: string) => accountId === effectiveAccountId,
  } as unknown as AccessRootAuthorityService

  return new OrganizationalUnitPolicy(rootAuthority)
}

test.group('Organizational unit policy', () => {
  test('allows every action only through effective access.root authority', async ({ assert }) => {
    const root = { id: 'root-account' } as UserAccount
    const ordinary = { id: 'ordinary-account' } as UserAccount
    const policy = policyFor(root.id)

    for (const action of actions) {
      assert.isTrue(await policy[action](root))
      assert.isFalse(await policy[action](ordinary))
    }
  })

  test('does not grant actions through an account or role-name shortcut', async ({ assert }) => {
    const account = {
      id: 'named-master-without-effective-assignment',
      status: 'ACTIVE',
    } as UserAccount
    const policy = policyFor(null)

    for (const action of actions) {
      assert.isFalse(await policy[action](account))
    }
  })
})
