import { randomUUID } from 'node:crypto'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import type { ApiRequest } from '@japa/api-client'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'
import AccessAuthorityChangedException from '#exceptions/access_authority_changed_exception'
import DuplicateException from '#exceptions/duplicate_exception'
import AccessEvent from '#models/access_event'
import OrganizationalUnit from '#models/organizational_unit'
import Permission from '#models/permission'
import Person from '#models/person'
import Role from '#models/role'
import RoleAssignment from '#models/role_assignment'
import RoleVersion from '#models/role_version'
import RoleVersionPermission from '#models/role_version_permission'
import UserAccount from '#models/user_account'
import RoleProvisioningService from '#services/role_provisioning_service'

async function createAccount(email: string, displayName: string) {
  const person = await Person.create({
    displayName,
    staffNumber: null,
    primaryEmail: email,
    primaryEmailVerifiedAt: DateTime.now(),
  })
  return UserAccount.create({
    personId: person.id,
    email,
    password: 'Role-administration-password-1',
    status: 'ACTIVE',
    credentialVersion: 1,
    passwordResetVersion: 0,
  })
}

async function createRootActor() {
  const accessRoot = await Permission.create({
    key: 'access.root',
    description: 'Administer identity, access, and organizational authority',
    customRoleAssignable: false,
  })
  await Permission.createMany([
    {
      key: 'stocktake.count',
      description: 'Submit an assigned stock-take count or recount',
      customRoleAssignable: true,
    },
    {
      key: 'stocktake.review',
      description: 'Review stock-take completion and verification exceptions',
      customRoleAssignable: true,
    },
  ])
  const rootRole = await Role.create({
    key: 'MASTER_ADMIN',
    name: 'Master Admin',
    systemManaged: true,
  })
  const rootVersion = await RoleVersion.create({
    roleId: rootRole.id,
    version: 1,
    reason: 'Role administration root',
    createdByAccountId: null,
  })
  await RoleVersionPermission.create({
    roleVersionId: rootVersion.id,
    permissionKey: accessRoot.key,
  })
  const institute = await OrganizationalUnit.create({
    name: 'Matti Institute',
    unitType: 'INSTITUTE',
    parentId: null,
  })
  const account = await createAccount('root.role.administration@example.com', 'Root Administrator')
  const assignment = await RoleAssignment.create({
    accountId: account.id,
    roleVersionId: rootVersion.id,
    scopeOrgUnitId: institute.id,
    scopeMode: 'INCLUDE_DESCENDANTS',
    startsAt: DateTime.now().minus({ minutes: 1 }),
    expiresAt: null,
    grantedByAccountId: null,
    reason: 'Role administration authority',
  })

  return { account, assignment, institute, rootRole }
}

async function createConfigurableRole(
  name: string,
  actorAccountId: string,
  permissionKey = 'stocktake.count'
) {
  const role = await Role.create({
    key: `CUSTOM_${randomUUID().replaceAll('-', '').toUpperCase()}`,
    name,
    systemManaged: false,
  })
  const version = await RoleVersion.create({
    roleId: role.id,
    version: 1,
    reason: `Create ${name}`,
    createdByAccountId: actorAccountId,
  })
  await RoleVersionPermission.create({
    roleVersionId: version.id,
    permissionKey,
  })
  return { role, version }
}

async function cleanupTables() {
  for (const table of [
    'access_events',
    'role_assignments',
    'role_version_permissions',
    'role_versions',
    'roles',
    'organizational_unit_versions',
    'user_accounts',
    'people',
    'organizational_units',
    'permissions',
  ]) {
    await db.from(table).delete()
  }
}

function authenticatedRequest(request: ApiRequest, account: UserAccount) {
  return request
    .loginAs(account)
    .withSession({ 'auth.credentialVersion': Number(account.credentialVersion) })
}

test.group('Roles administration', (group) => {
  group.each.setup(cleanupTables)

  test('authorizes before validating role writes', async ({ client }) => {
    const ordinary = await createAccount('ordinary.role.admin@example.com', 'Ordinary')
    const anonymous = await client.post('/roles').json({})
    const unauthorized = await authenticatedRequest(client.post('/roles').json({}), ordinary)

    anonymous.assertStatus(401)
    unauthorized.assertStatus(403)
  })

  test('creates a configurable role with an opaque key, version, audit, and message response', async ({
    client,
    assert,
  }) => {
    const { account } = await createRootActor()
    const response = await authenticatedRequest(
      client.post('/roles').json({
        name: 'Department Counter',
        permissionKeys: ['stocktake.count'],
        reason: 'Create a focused counting role',
      }),
      account
    )

    response.assertStatus(201)
    response.assertBody({ message: 'Role created.' })
    const role = await Role.findByOrFail('name', 'Department Counter')
    assert.match(role.key, /^CUSTOM_[0-9A-F]{32}$/)
    assert.isFalse(role.systemManaged)
    const version = await RoleVersion.findByOrFail('roleId', role.id)
    assert.equal(Number(version.version), 1)
    const membership = await RoleVersionPermission.findByOrFail('roleVersionId', version.id)
    assert.equal(membership.permissionKey, 'stocktake.count')
    const event = await AccessEvent.query()
      .where('event_type', 'ROLE_CREATED')
      .where('target_id', role.id)
      .firstOrFail()
    assert.equal(event.actorAccountId, account.id)
    assert.equal(event.targetType, 'ROLE')
  })

  test('creates a new immutable permission version without changing existing assignments', async ({
    client,
    assert,
  }) => {
    const { account, institute } = await createRootActor()
    const { role, version: first } = await createConfigurableRole('Count Officer', account.id)
    const assignment = await RoleAssignment.create({
      accountId: account.id,
      roleVersionId: first.id,
      scopeOrgUnitId: institute.id,
      scopeMode: 'THIS_NODE_ONLY',
      startsAt: DateTime.now(),
      expiresAt: null,
      grantedByAccountId: account.id,
      reason: 'Use the first role version',
    })

    const response = await authenticatedRequest(
      client.post(`/roles/${role.id}/permissions`).json({
        permissionKeys: ['stocktake.review', 'stocktake.count'],
        reason: 'Add review responsibility for future assignments',
      }),
      account
    )
    response.assertStatus(200)
    response.assertBody({ message: 'A new role permission version was created.' })

    const versions = await RoleVersion.query().where('role_id', role.id).orderBy('version', 'asc')
    assert.deepEqual(
      versions.map(({ version }) => Number(version)),
      [1, 2]
    )
    await assignment.refresh()
    assert.equal(assignment.roleVersionId, first.id)
    const secondPermissions = await RoleVersionPermission.query()
      .where('role_version_id', versions[1].id)
      .orderBy('permission_key', 'asc')
    assert.deepEqual(
      secondPermissions.map(({ permissionKey }) => permissionKey),
      ['stocktake.count', 'stocktake.review']
    )
  })

  test('rejects duplicate, unknown, restricted, and unchanged permission selections', async ({
    client,
    assert,
  }) => {
    const { account } = await createRootActor()
    const { role } = await createConfigurableRole('Restricted Tester', account.id)

    for (const permissionKeys of [
      ['stocktake.count', 'stocktake.count'],
      ['unknown.permission'],
      ['access.root'],
      ['stocktake.count'],
    ]) {
      const response = await authenticatedRequest(
        client.post(`/roles/${role.id}/permissions`).json({
          permissionKeys,
          reason: 'Exercise permission safeguards',
        }),
        account
      )
      response.assertStatus(409)
      response.assertBodyContains({ code: 'E_INVALID_ROLE_CHANGE' })
    }

    const versions = await RoleVersion.query().where('role_id', role.id)
    assert.lengthOf(versions, 1)
  })

  test('protects system roles and rejects archiving roles with current assignments', async ({
    client,
  }) => {
    const { account, institute, rootRole } = await createRootActor()
    const protectedResponse = await authenticatedRequest(
      client.post(`/roles/${rootRole.id}/rename`).json({
        name: 'Renamed Root',
        reason: 'Attempt to change the access root',
      }),
      account
    )
    protectedResponse.assertStatus(409)

    const { role, version } = await createConfigurableRole('Assigned Role', account.id)
    const assignment = await RoleAssignment.create({
      accountId: account.id,
      roleVersionId: version.id,
      scopeOrgUnitId: institute.id,
      scopeMode: 'THIS_NODE_ONLY',
      startsAt: DateTime.now().minus({ days: 2 }),
      expiresAt: DateTime.now().plus({ days: 1 }),
      grantedByAccountId: account.id,
      reason: 'Current assignment',
    })
    const blocked = await authenticatedRequest(
      client.post(`/roles/${role.id}/archive`).json({ reason: 'Archive assigned role' }),
      account
    )
    blocked.assertStatus(409)

    assignment.expiresAt = DateTime.now().minus({ seconds: 1 })
    await assignment.save()
    const archived = await authenticatedRequest(
      client.post(`/roles/${role.id}/archive`).json({ reason: 'Archive unused role' }),
      account
    )
    archived.assertStatus(200)
    const restored = await authenticatedRequest(
      client.post(`/roles/${role.id}/restore`).json({ reason: 'Restore the reusable role' }),
      account
    )
    restored.assertStatus(200)
  })

  test('renames roles with case-insensitive active-name uniqueness', async ({ client, assert }) => {
    const { account } = await createRootActor()
    const first = await createConfigurableRole('First Counter', account.id)
    await createConfigurableRole('Second Counter', account.id)

    const renamed = await authenticatedRequest(
      client.post(`/roles/${first.role.id}/rename`).json({
        name: 'Senior Counter',
        reason: 'Clarify the role responsibility',
      }),
      account
    )
    renamed.assertStatus(200)

    const duplicate = await authenticatedRequest(
      client.post(`/roles/${first.role.id}/rename`).json({
        name: 'second counter',
        reason: 'Attempt a duplicate active name',
      }),
      account
    )
    duplicate.assertStatus(409)
    duplicate.assertBodyContains({ code: 'E_DUPLICATE' })
    await first.role.refresh()
    assert.equal(first.role.name, 'Senior Counter')
  })

  test('transactionally rejects an actor whose root authority expired after authorization', async ({
    assert,
  }) => {
    const { account, assignment } = await createRootActor()
    assignment.expiresAt = DateTime.now().minus({ seconds: 1 })
    await assignment.save()
    const service = await app.container.make(RoleProvisioningService)

    try {
      await service.create(
        {
          name: 'Rejected Role',
          permissionKeys: ['stocktake.count'],
          reason: 'Stale administrator request',
        },
        account.id
      )
      assert.fail('Expected expired root authority to reject role provisioning')
    } catch (error) {
      assert.instanceOf(error, AccessAuthorityChangedException)
    }
    assert.isNull(await Role.findBy('name', 'Rejected Role'))
  })

  test('serializes concurrent duplicate role creation and commits exactly one role', async ({
    assert,
  }) => {
    const { account } = await createRootActor()
    const service = await app.container.make(RoleProvisioningService)

    const results = await Promise.allSettled([
      service.create(
        {
          name: 'Concurrent Counter',
          permissionKeys: ['stocktake.count'],
          reason: 'First concurrent request',
        },
        account.id
      ),
      service.create(
        {
          name: 'concurrent counter',
          permissionKeys: ['stocktake.count'],
          reason: 'Second concurrent request',
        },
        account.id
      ),
    ])

    assert.lengthOf(
      results.filter(({ status }) => status === 'fulfilled'),
      1
    )
    const rejected = results.find(({ status }) => status === 'rejected')
    assert.instanceOf(rejected?.status === 'rejected' ? rejected.reason : null, DuplicateException)
    assert.lengthOf(await Role.query().whereILike('name', 'concurrent counter'), 1)
    assert.lengthOf(await AccessEvent.query().where('event_type', 'ROLE_CREATED'), 1)
  })

  test('rolls back role creation when its audit event cannot be persisted', async ({ assert }) => {
    const { account } = await createRootActor()
    const service = await app.container.make(RoleProvisioningService)

    await assert.rejects(() =>
      service.create(
        {
          name: 'Atomic Role',
          permissionKeys: ['stocktake.count'],
          reason: 'Verify atomic audit persistence',
        },
        account.id,
        { ip: 'not-an-ip-address', requestId: 'role-atomicity' }
      )
    )

    assert.isNull(await Role.findBy('name', 'Atomic Role'))
    assert.lengthOf(await AccessEvent.query().where('target_type', 'ROLE'), 0)
  })
})
