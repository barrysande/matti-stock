import { randomUUID } from 'node:crypto'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
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
import AccessRegistrySeeder from '#database/seeders/access_registry_seeder'

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
    password: 'Role-directory-password-1',
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
  await Permission.create({
    key: 'stocktake.count',
    description: 'Submit an assigned stock-take count or recount',
    customRoleAssignable: true,
  })
  const rootRole = await Role.create({
    key: 'MASTER_ADMIN',
    name: 'Master Admin',
    systemManaged: true,
  })
  const rootVersion = await RoleVersion.create({
    roleId: rootRole.id,
    version: 1,
    reason: 'Role directory root',
    createdByAccountId: null,
  })
  await RoleVersionPermission.create({
    roleVersionId: rootVersion.id,
    permissionKey: accessRoot.key,
  })
  const institute = await OrganizationalUnit.create({
    name: 'MaTTI Institute',
    unitType: 'INSTITUTE',
    parentId: null,
  })
  const account = await createAccount('root.role.directory@example.com', 'Root Directory')
  await RoleAssignment.create({
    accountId: account.id,
    roleVersionId: rootVersion.id,
    scopeOrgUnitId: institute.id,
    scopeMode: 'INCLUDE_DESCENDANTS',
    startsAt: DateTime.now().minus({ minutes: 1 }),
    expiresAt: null,
    grantedByAccountId: null,
    reason: 'Role directory authority',
  })

  return { account, institute }
}

function cleanupTables() {
  return testUtils.db().truncate()
}

function authenticatedRequest(request: ApiRequest, account: UserAccount) {
  return request
    .loginAs(account)
    .withSession({ 'auth.credentialVersion': Number(account.credentialVersion) })
}

test.group('Roles directory', (group) => {
  group.each.setup(cleanupTables)

  test('rejects anonymous and unauthorized permission and role reads', async ({ client }) => {
    const anonymous = await client.get('/roles')
    anonymous.assertStatus(401)

    const ordinary = await createAccount('ordinary.role.directory@example.com', 'Ordinary')
    const permissions = await authenticatedRequest(client.get('/permissions'), ordinary)
    const roles = await authenticatedRequest(client.get('/roles'), ordinary)
    permissions.assertStatus(403)
    roles.assertStatus(403)
  })

  test('seeds the stable registry and configurable starter roles without rewriting versions', async ({
    assert,
  }) => {
    const seeder = new AccessRegistrySeeder(db.connection())
    await seeder.run()
    await seeder.run()

    assert.equal(
      await Permission.query()
        .count('* as total')
        .then(([row]) => Number(row.$extras.total)),
      32
    )
    const roles = await Role.query().orderBy('key', 'asc')
    assert.deepEqual(
      roles.map(({ key, systemManaged }) => ({ key, systemManaged })),
      [
        { key: 'FINANCE_SUPERVISOR', systemManaged: false },
        { key: 'MASTER_ADMIN', systemManaged: true },
        { key: 'STOCK_SUPERVISOR', systemManaged: false },
        { key: 'STOCK_TAKER', systemManaged: false },
        { key: 'STORE_SUPERVISOR', systemManaged: false },
      ]
    )
    assert.equal(
      await RoleVersion.query()
        .count('* as total')
        .then(([row]) => Number(row.$extras.total)),
      5
    )
    const root = await Permission.findByOrFail('key', 'access.root')
    assert.isFalse(root.customRoleAssignable)
    const storeRole = await Role.findByOrFail('key', 'STORE_SUPERVISOR')
    const storeVersion = await RoleVersion.query()
      .where('role_id', storeRole.id)
      .preload('permissions')
      .firstOrFail()
    assert.includeMembers(
      storeVersion.permissions.map(({ permissionKey }) => permissionKey),
      ['evidence.read', 'stock.read', 'valuation.read']
    )
  })

  test('upgrades only the unchanged starter baseline and preserves old assignments', async ({
    assert,
  }) => {
    const previousPermissions = [
      'catalogue.manage',
      'condition.report',
      'disposal.complete',
      'intake.record',
      'intake_correction.approve',
      'intake_correction.propose',
      'movement.allocate',
      'movement.receive',
      'movement.release',
    ]
    await Permission.createMany(
      previousPermissions.map((key) => ({
        key,
        description: `${key} test permission`,
        customRoleAssignable: true,
      }))
    )
    const role = await Role.create({
      key: 'STORE_SUPERVISOR',
      name: 'Store Supervisor',
      systemManaged: false,
    })
    const first = await RoleVersion.create({
      roleId: role.id,
      version: 1,
      reason: 'Initial V1 Store Supervisor starter role',
      createdByAccountId: null,
    })
    await RoleVersionPermission.createMany(
      previousPermissions.map((permissionKey) => ({
        roleVersionId: first.id,
        permissionKey,
      }))
    )
    const institute = await OrganizationalUnit.create({
      name: 'MaTTI Institute',
      unitType: 'INSTITUTE',
      parentId: null,
    })
    const account = await createAccount('legacy.store@example.com', 'Legacy Store Holder')
    const assignment = await RoleAssignment.create({
      accountId: account.id,
      roleVersionId: first.id,
      scopeOrgUnitId: institute.id,
      scopeMode: 'INCLUDE_DESCENDANTS',
      startsAt: DateTime.now().minus({ minutes: 1 }),
      expiresAt: null,
      grantedByAccountId: null,
      reason: 'Legacy starter assignment',
    })
    const seeder = new AccessRegistrySeeder(db.connection())

    await seeder.run()

    const second = await RoleVersion.query()
      .where('role_id', role.id)
      .where('version', 2)
      .preload('permissions')
      .firstOrFail()
    assert.includeMembers(
      second.permissions.map(({ permissionKey }) => permissionKey),
      ['evidence.read', 'stock.read', 'valuation.read']
    )
    await assignment.refresh()
    assert.equal(assignment.roleVersionId, first.id)

    const customized = await RoleVersion.create({
      roleId: role.id,
      version: 3,
      reason: 'Administrator selected a custom membership',
      createdByAccountId: account.id,
    })
    await RoleVersionPermission.createMany(
      previousPermissions.map((permissionKey) => ({
        roleVersionId: customized.id,
        permissionKey,
      }))
    )

    await seeder.run()

    assert.equal(
      await RoleVersion.query()
        .where('role_id', role.id)
        .count('* as total')
        .then(([row]) => Number(row.$extras.total)),
      3
    )
  })

  test('returns permission metadata and current role projections with filters', async ({
    client,
    assert,
  }) => {
    const { account } = await createRootActor()
    const custom = await Role.create({
      key: `CUSTOM_${randomUUID().replaceAll('-', '').toUpperCase()}`,
      name: 'Department Counter',
      systemManaged: false,
    })
    const version = await RoleVersion.create({
      roleId: custom.id,
      version: 1,
      reason: 'Initial counter role',
      createdByAccountId: account.id,
    })
    await RoleVersionPermission.create({
      roleVersionId: version.id,
      permissionKey: 'stocktake.count',
    })

    const permissions = await authenticatedRequest(client.get('/permissions'), account)
    permissions.assertStatus(200)
    assert.deepInclude(permissions.body().data, {
      key: 'access.root',
      description: 'Administer identity, access, and organizational authority',
      customRoleAssignable: false,
    })

    const roles = await authenticatedRequest(
      client.get('/roles').qs({ search: 'counter', systemManaged: false }),
      account
    )
    roles.assertStatus(200)
    assert.equal(roles.body().data[0].name, 'Department Counter')
    assert.deepEqual(roles.body().data[0].currentVersion.permissionKeys, ['stocktake.count'])
    assert.notProperty(roles.body().data[0], 'versions')
  })

  test('returns paginated version history and older-version assignment usage', async ({
    client,
    assert,
  }) => {
    const { account, institute } = await createRootActor()
    const role = await Role.create({
      key: `CUSTOM_${randomUUID().replaceAll('-', '').toUpperCase()}`,
      name: 'Count Reviewer',
      systemManaged: false,
    })
    const first = await RoleVersion.create({
      roleId: role.id,
      version: 1,
      reason: 'First role version',
      createdByAccountId: account.id,
    })
    const second = await RoleVersion.create({
      roleId: role.id,
      version: 2,
      reason: 'Second role version',
      createdByAccountId: account.id,
    })
    await RoleVersionPermission.createMany([
      { roleVersionId: first.id, permissionKey: 'stocktake.count' },
      { roleVersionId: second.id, permissionKey: 'stocktake.count' },
    ])
    await RoleAssignment.create({
      accountId: account.id,
      roleVersionId: first.id,
      scopeOrgUnitId: institute.id,
      scopeMode: 'THIS_NODE_ONLY',
      startsAt: DateTime.now(),
      expiresAt: null,
      grantedByAccountId: account.id,
      reason: 'Keep an older version in use',
    })

    const detail = await authenticatedRequest(client.get(`/roles/${role.id}`), account)
    detail.assertStatus(200)
    assert.equal(detail.body().data.currentVersion.version, 2)
    assert.equal(detail.body().data.olderVersionAssignmentCount, 1)
    assert.notProperty(detail.body().data, 'versions')

    const history = await authenticatedRequest(client.get(`/roles/${role.id}/history`), account)
    history.assertStatus(200)
    assert.deepEqual(
      history.body().data.map((item: { version: number }) => item.version),
      [2, 1]
    )
    assert.equal(history.body().data[0].createdBy.displayName, 'Root Directory')
    assert.equal(history.body().metadata.currentPage, 1)
  })

  test('paginates the directory and keeps selector options complete', async ({
    client,
    assert,
  }) => {
    const { account } = await createRootActor()

    for (let index = 1; index <= 20; index += 1) {
      const role = await Role.create({
        key: `CUSTOM_PAGE_${String(index).padStart(2, '0')}`,
        name: `Paged Role ${String(index).padStart(2, '0')}`,
        systemManaged: false,
      })
      await RoleVersion.create({
        roleId: role.id,
        version: 1,
        reason: 'Test role pagination',
        createdByAccountId: account.id,
      })
    }

    const directory = await authenticatedRequest(client.get('/roles').qs({ page: 2 }), account)
    directory.assertStatus(200)
    assert.lengthOf(directory.body().data, 1)
    assert.equal(directory.body().metadata.currentPage, 2)
    assert.equal(directory.body().metadata.lastPage, 2)

    const options = await authenticatedRequest(client.get('/roles/options'), account)
    options.assertStatus(200)
    assert.lengthOf(options.body().data, 21)
    assert.notProperty(options.body(), 'metadata')
  })

  test('authorizes before validating filters or resolving an identifier', async ({ client }) => {
    const ordinary = await createAccount('ordinary.role.validation@example.com', 'Ordinary')
    const invalid = await authenticatedRequest(
      client.get('/roles').qs({ includeArchived: 'not-a-boolean' }),
      ordinary
    )
    const missing = await authenticatedRequest(client.get(`/roles/${randomUUID()}`), ordinary)

    invalid.assertStatus(403)
    missing.assertStatus(403)
  })
})
