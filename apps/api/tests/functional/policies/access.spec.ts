import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'
import OrganizationalUnit from '#models/organizational_unit'
import Permission from '#models/permission'
import Person from '#models/person'
import Role from '#models/role'
import RoleAssignment from '#models/role_assignment'
import RoleVersion from '#models/role_version'
import RoleVersionPermission from '#models/role_version_permission'
import UserAccount from '#models/user_account'
import AccessPolicy from '#policies/access_policy'

interface GrantOptions {
  accountStatus?: 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED'
  archivedRole?: boolean
  grantAccessRoot?: boolean
  scopeMode?: 'THIS_NODE_ONLY' | 'INCLUDE_DESCENDANTS'
  startsAt?: DateTime
  expiresAt?: DateTime | null
}

async function createAccessGrant(options: GrantOptions = {}) {
  const now = DateTime.now()
  const permission = await Permission.create({
    key: 'access.root',
    description: 'Administer identity, access, and organizational authority',
  })
  const role = await Role.create({
    key: 'MASTER_ADMIN',
    name: 'Master Admin',
    systemManaged: true,
    archivedAt: options.archivedRole ? now : null,
  })
  const roleVersion = await RoleVersion.create({
    roleId: role.id,
    version: 1,
    reason: 'Test access root',
    createdByAccountId: null,
  })

  if (options.grantAccessRoot !== false) {
    await RoleVersionPermission.create({
      roleVersionId: roleVersion.id,
      permissionKey: permission.key,
    })
  }

  const institute = await OrganizationalUnit.create({
    name: 'Matti Institute',
    unitType: 'INSTITUTE',
    parentId: null,
  })
  const person = await Person.create({
    displayName: 'Master Administrator',
    staffNumber: null,
    primaryEmail: 'master@example.com',
    primaryEmailVerifiedAt: now,
  })
  const account = await UserAccount.create({
    personId: person.id,
    email: person.primaryEmail!,
    password: 'Test-password-123',
    status: options.accountStatus ?? 'ACTIVE',
    credentialVersion: 1,
    passwordResetVersion: 0,
  })
  const assignment = await RoleAssignment.create({
    accountId: account.id,
    roleVersionId: roleVersion.id,
    scopeOrgUnitId: institute.id,
    scopeMode: options.scopeMode ?? 'INCLUDE_DESCENDANTS',
    startsAt: options.startsAt ?? now.minus({ minutes: 1 }),
    expiresAt: options.expiresAt ?? null,
    grantedByAccountId: null,
    reason: 'Test access administration authority',
  })

  return { account, assignment, institute, role }
}

async function cleanupAccessTables() {
  const tables = [
    'password_reset_redemptions',
    'password_reset_challenges',
    'access_events',
    'role_assignments',
    'role_version_permissions',
    'role_versions',
    'roles',
    'user_accounts',
    'people',
    'organizational_units',
    'permissions',
  ]

  for (const table of tables) {
    await db.from(table).delete()
  }
}

test.group('Access policy', (group) => {
  group.each.setup(cleanupAccessTables)

  test('allows each account action through active institution-wide access.root', async ({
    assert,
  }) => {
    const { account } = await createAccessGrant()
    const policy = await app.container.make(AccessPolicy)

    assert.isTrue(await policy.createAccount(account))
    assert.isTrue(await policy.resetAccountPassword(account))
    assert.isTrue(await policy.suspendAccount(account))
    assert.isTrue(await policy.restoreAccount(account))
    assert.isTrue(await policy.deactivateAccount(account))
    assert.isTrue(await policy.reactivateAccount(account))
  })

  test('denies inactive, future, and expired authority', async ({ assert }) => {
    const { account, assignment } = await createAccessGrant()
    const policy = await app.container.make(AccessPolicy)

    await UserAccount.query().where('id', account.id).update({ status: 'SUSPENDED' })
    assert.equal(account.status, 'ACTIVE')
    assert.isFalse(await policy.createAccount(account))

    await UserAccount.query().where('id', account.id).update({ status: 'ACTIVE' })
    assignment.startsAt = DateTime.now().plus({ hours: 1 })
    await assignment.save()
    assert.isFalse(await policy.createAccount(account))

    assignment.startsAt = DateTime.now().minus({ hours: 2 })
    assignment.expiresAt = DateTime.now().minus({ hours: 1 })
    await assignment.save()
    assert.isFalse(await policy.createAccount(account))
  })

  test('denies archived, narrow, and department-scoped root authority', async ({ assert }) => {
    const { account, assignment, institute, role } = await createAccessGrant()
    const policy = await app.container.make(AccessPolicy)

    role.archivedAt = DateTime.now()
    await role.save()
    assert.isFalse(await policy.createAccount(account))

    role.archivedAt = null
    await role.save()
    assignment.scopeMode = 'THIS_NODE_ONLY'
    await assignment.save()
    assert.isFalse(await policy.createAccount(account))

    assignment.scopeMode = 'INCLUDE_DESCENDANTS'
    const department = await OrganizationalUnit.create({
      name: 'Engineering',
      unitType: 'DEPARTMENT',
      parentId: institute.id,
    })
    assignment.scopeOrgUnitId = department.id
    await assignment.save()
    assert.isFalse(await policy.createAccount(account))
  })

  test('denies a Master Admin role without access.root', async ({ assert }) => {
    const { account } = await createAccessGrant({ grantAccessRoot: false })
    const policy = await app.container.make(AccessPolicy)

    assert.isFalse(await policy.createAccount(account))
  })
})
