import { randomUUID } from 'node:crypto'
import testUtils from '@adonisjs/core/services/test_utils'
import type { ApiRequest } from '@japa/api-client'
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

interface AccountOptions {
  displayName: string
  email: string
  staffNumber?: string | null
  status?: 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED'
  verified?: boolean
  lastLoginAt?: DateTime | null
}

async function createAccount(options: AccountOptions) {
  const person = await Person.create({
    displayName: options.displayName,
    staffNumber: options.staffNumber ?? null,
    primaryEmail: options.email,
    primaryEmailVerifiedAt: options.verified === false ? null : DateTime.now(),
  })
  const account = await UserAccount.create({
    personId: person.id,
    email: options.email,
    password: 'Directory-test-password-123',
    status: options.status ?? 'ACTIVE',
    credentialVersion: 1,
    passwordResetVersion: 0,
    lastLoginAt: options.lastLoginAt ?? null,
  })

  return { account, person }
}

async function createRole(key: string, name: string, archived = false) {
  const role = await Role.create({
    key,
    name,
    systemManaged: false,
    archivedAt: archived ? DateTime.now() : null,
  })
  const roleVersion = await RoleVersion.create({
    roleId: role.id,
    version: 1,
    reason: `Create ${name} for account directory tests`,
    createdByAccountId: null,
  })

  return { role, roleVersion }
}

async function createRootActor() {
  const permission = await Permission.create({
    key: 'access.root',
    description: 'Administer identity, access, and organizational authority',
    customRoleAssignable: false,
  })
  const { roleVersion } = await createRole('MASTER_ADMIN', 'Master Admin')
  await RoleVersionPermission.create({
    roleVersionId: roleVersion.id,
    permissionKey: permission.key,
  })
  const institute = await OrganizationalUnit.create({
    name: 'MaTTI Institute',
    unitType: 'INSTITUTE',
    parentId: null,
  })
  const { account } = await createAccount({
    displayName: 'Master Administrator',
    email: 'master@example.com',
    staffNumber: 'MASTER-001',
  })
  await RoleAssignment.create({
    accountId: account.id,
    roleVersionId: roleVersion.id,
    scopeOrgUnitId: institute.id,
    scopeMode: 'INCLUDE_DESCENDANTS',
    startsAt: DateTime.now().minus({ minutes: 1 }),
    expiresAt: null,
    grantedByAccountId: null,
    reason: 'Test account directory authority',
  })

  return { account, institute }
}

function cleanupAccessTables() {
  return testUtils.db().truncate()
}

function authenticatedRequest(request: ApiRequest, account: UserAccount) {
  return request
    .loginAs(account)
    .withSession({ 'auth.credentialVersion': Number(account.credentialVersion) })
}

test.group('Accounts directory and details', (group) => {
  group.each.setup(cleanupAccessTables)

  test('rejects anonymous directory and detail requests', async ({ client }) => {
    const accountId = randomUUID()

    const directory = await client.get('/accounts')
    const details = await client.get(`/accounts/${accountId}`)

    directory.assertStatus(401)
    details.assertStatus(401)
  })

  test('denies directory and detail access without access.root', async ({ client }) => {
    const { account } = await createAccount({
      displayName: 'Ordinary Account',
      email: 'ordinary@example.com',
    })

    const directory = await authenticatedRequest(client.get('/accounts'), account)
    const details = await authenticatedRequest(client.get(`/accounts/${account.id}`), account)

    directory.assertStatus(403)
    details.assertStatus(403)
  })

  test('returns a safe, alphabetically ordered paginated directory', async ({ client, assert }) => {
    const { account: actor } = await createRootActor()
    const lastLoginAt = DateTime.now().minus({ hours: 2 })
    const { account: zed } = await createAccount({
      displayName: 'Zed Holder',
      email: 'zed@example.com',
      staffNumber: 'STAFF-002',
      lastLoginAt,
    })
    const { account: aaron } = await createAccount({
      displayName: 'Aaron Holder',
      email: 'aaron@example.com',
      staffNumber: 'STAFF-001',
      status: 'SUSPENDED',
      verified: false,
    })

    const response = await authenticatedRequest(client.get('/accounts'), actor)

    response.assertStatus(200)
    const body = response.body()
    assert.deepEqual(
      body.data.map((account: { person: { displayName: string } }) => account.person.displayName),
      ['Aaron Holder', 'Master Administrator', 'Zed Holder']
    )
    assert.equal(body.metadata.total, 3)
    assert.equal(body.metadata.perPage, 20)

    const listedAaron = body.data[0]
    assert.deepInclude(listedAaron, {
      id: aaron.id,
      email: aaron.email,
      status: 'SUSPENDED',
      setupStatus: 'PENDING',
      person: {
        id: listedAaron.person.id,
        displayName: 'Aaron Holder',
        staffNumber: 'STAFF-001',
      },
    })
    assert.notProperty(listedAaron, 'password')
    assert.notProperty(listedAaron, 'credentialVersion')
    assert.notProperty(listedAaron, 'passwordResetVersion')

    const listedZed = body.data.find((account: { id: string }) => account.id === zed.id)
    assert.equal(listedZed.lastLoginAt, lastLoginAt.toISO())
  })

  test('filters the directory by search, lifecycle status, and setup status', async ({
    client,
    assert,
  }) => {
    const { account: actor } = await createRootActor()
    const { account: target } = await createAccount({
      displayName: 'Jane Finance',
      email: 'jane.finance@example.com',
      staffNumber: 'FIN-042',
      status: 'SUSPENDED',
      verified: false,
    })
    await createAccount({
      displayName: 'John Stores',
      email: 'john.stores@example.com',
      staffNumber: 'STORE-007',
    })

    for (const search of ['Jane', 'jane.finance@example.com', 'FIN-042']) {
      const response = await authenticatedRequest(
        client.get('/accounts').qs({ search, status: 'SUSPENDED', setupStatus: 'PENDING' }),
        actor
      )

      response.assertStatus(200)
      assert.deepEqual(
        response.body().data.map((account: { id: string }) => account.id),
        [target.id]
      )
    }
  })

  test('validates directory filters', async ({ client }) => {
    const { account: actor } = await createRootActor()
    const response = await authenticatedRequest(
      client.get('/accounts').qs({ page: 0, status: 'UNKNOWN', setupStatus: 'UNKNOWN' }),
      actor
    )

    response.assertStatus(422)
  })

  test('returns current role assignments and scopes in the account details', async ({
    client,
    assert,
  }) => {
    const now = DateTime.now()
    const { account: actor, institute } = await createRootActor()
    const { account: target } = await createAccount({
      displayName: 'Scoped Account',
      email: 'scoped@example.com',
      staffNumber: 'SCOPE-001',
    })
    const department = await OrganizationalUnit.create({
      name: 'Finance',
      unitType: 'DEPARTMENT',
      parentId: institute.id,
    })
    const archivedDepartment = await OrganizationalUnit.create({
      name: 'Archived Department',
      unitType: 'DEPARTMENT',
      parentId: institute.id,
      archivedAt: now,
    })
    const currentRole = await createRole('FINANCE_REVIEWER', 'Finance Reviewer')
    const futureRole = await createRole('FUTURE_ROLE', 'Future Role')
    const expiredRole = await createRole('EXPIRED_ROLE', 'Expired Role')
    const archivedRole = await createRole('ARCHIVED_ROLE', 'Archived Role', true)

    const currentAssignment = await RoleAssignment.create({
      accountId: target.id,
      roleVersionId: currentRole.roleVersion.id,
      scopeOrgUnitId: department.id,
      scopeMode: 'THIS_NODE_ONLY',
      startsAt: now.minus({ days: 1 }),
      expiresAt: now.plus({ days: 1 }),
      grantedByAccountId: actor.id,
      reason: 'Approved finance review access',
    })
    await RoleAssignment.createMany([
      {
        accountId: target.id,
        roleVersionId: futureRole.roleVersion.id,
        scopeOrgUnitId: department.id,
        scopeMode: 'THIS_NODE_ONLY',
        startsAt: now.plus({ days: 1 }),
        expiresAt: null,
        grantedByAccountId: actor.id,
        reason: 'Future assignment',
      },
      {
        accountId: target.id,
        roleVersionId: expiredRole.roleVersion.id,
        scopeOrgUnitId: department.id,
        scopeMode: 'THIS_NODE_ONLY',
        startsAt: now.minus({ days: 2 }),
        expiresAt: now.minus({ days: 1 }),
        grantedByAccountId: actor.id,
        reason: 'Expired assignment',
      },
      {
        accountId: target.id,
        roleVersionId: archivedRole.roleVersion.id,
        scopeOrgUnitId: department.id,
        scopeMode: 'THIS_NODE_ONLY',
        startsAt: now.minus({ days: 1 }),
        expiresAt: null,
        grantedByAccountId: actor.id,
        reason: 'Archived role assignment',
      },
      {
        accountId: target.id,
        roleVersionId: currentRole.roleVersion.id,
        scopeOrgUnitId: archivedDepartment.id,
        scopeMode: 'THIS_NODE_ONLY',
        startsAt: now.minus({ days: 1 }),
        expiresAt: null,
        grantedByAccountId: actor.id,
        reason: 'Archived scope assignment',
      },
    ])

    const response = await authenticatedRequest(client.get(`/accounts/${target.id}`), actor)

    response.assertStatus(200)
    const details = response.body().data
    assert.equal(details.id, target.id)
    assert.equal(details.setupStatus, 'COMPLETE')
    assert.lengthOf(details.roleAssignments, 4)
    const current = details.roleAssignments.find(
      ({ id }: { id: string }) => id === currentAssignment.id
    )
    assert.deepInclude(current, {
      id: currentAssignment.id,
      role: {
        id: currentRole.role.id,
        key: 'FINANCE_REVIEWER',
        name: 'Finance Reviewer',
        versionId: currentRole.roleVersion.id,
        version: 1,
        isLatestVersion: true,
        permissionKeys: [],
      },
      scope: {
        organizationalUnitId: department.id,
        name: 'Finance',
        path: 'MaTTI Institute / Finance',
        unitType: 'DEPARTMENT',
        mode: 'THIS_NODE_ONLY',
      },
      reason: 'Approved finance review access',
      status: 'ACTIVE',
      effectiveNow: true,
    })
    const future = details.roleAssignments.find(
      ({ reason }: { reason: string }) => reason === 'Future assignment'
    )
    assert.equal(future.status, 'UPCOMING')
    assert.include(future.ineffectiveReasons, 'NOT_STARTED')
    const archivedRoleGrant = details.roleAssignments.find(
      ({ reason }: { reason: string }) => reason === 'Archived role assignment'
    )
    assert.include(archivedRoleGrant.ineffectiveReasons, 'ROLE_ARCHIVED')
    const archivedScopeGrant = details.roleAssignments.find(
      ({ reason }: { reason: string }) => reason === 'Archived scope assignment'
    )
    assert.include(archivedScopeGrant.ineffectiveReasons, 'SCOPE_ARCHIVED')
    assert.notProperty(details, 'password')
    assert.notProperty(details, 'credentialVersion')
    assert.notProperty(details, 'passwordResetVersion')
    assert.deepEqual(details.delegations, { incoming: [], outgoing: [] })
  })

  test('returns not found for unknown account details', async ({ client }) => {
    const { account: actor } = await createRootActor()
    const response = await authenticatedRequest(client.get(`/accounts/${randomUUID()}`), actor)

    response.assertStatus(404)
  })
})
