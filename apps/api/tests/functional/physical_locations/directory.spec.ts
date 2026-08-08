import { randomUUID } from 'node:crypto'
import testUtils from '@adonisjs/core/services/test_utils'
import type { ApiRequest } from '@japa/api-client'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'
import OrganizationalUnit from '#models/organizational_unit'
import Permission from '#models/permission'
import Person from '#models/person'
import PhysicalLocation from '#models/physical_location'
import PhysicalLocationVersion from '#models/physical_location_version'
import Role from '#models/role'
import RoleAssignment from '#models/role_assignment'
import RoleVersion from '#models/role_version'
import RoleVersionPermission from '#models/role_version_permission'
import UserAccount from '#models/user_account'

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
    password: 'Directory-password-1',
    status: 'ACTIVE',
    credentialVersion: 1,
    passwordResetVersion: 0,
  })
}

async function createRootActor() {
  const permission = await Permission.create({
    key: 'access.root',
    description: 'Administer identity, access, and organizational authority',
    customRoleAssignable: false,
  })
  const role = await Role.create({
    key: 'MASTER_ADMIN',
    name: 'Master Admin',
    systemManaged: true,
  })
  const roleVersion = await RoleVersion.create({
    roleId: role.id,
    version: 1,
    reason: 'Physical-location directory test role',
    createdByAccountId: null,
  })
  await RoleVersionPermission.create({
    roleVersionId: roleVersion.id,
    permissionKey: permission.key,
  })
  const institute = await OrganizationalUnit.create({
    name: 'MaTTI Institute',
    unitType: 'INSTITUTE',
    parentId: null,
  })
  const account = await createAccount('root.location.directory@example.com', 'Root Directory')
  await RoleAssignment.create({
    accountId: account.id,
    roleVersionId: roleVersion.id,
    scopeOrgUnitId: institute.id,
    scopeMode: 'INCLUDE_DESCENDANTS',
    startsAt: DateTime.now().minus({ minutes: 1 }),
    expiresAt: null,
    grantedByAccountId: null,
    reason: 'Physical-location directory authority',
  })

  return account
}

async function createLocation(
  name: string,
  parentId: string | null,
  changedByAccountId: string,
  archivedAt: DateTime | null = null
) {
  const location = await PhysicalLocation.create({ name, parentId, archivedAt })
  await PhysicalLocationVersion.create({
    physicalLocationId: location.id,
    version: 1,
    name,
    parentId,
    archivedAt,
    effectiveFrom: location.createdAt,
    effectiveTo: null,
    changedByAccountId,
    reason: `Create ${name} test location`,
  })
  return location
}

function cleanupTables() {
  return testUtils.db().truncate()
}

function authenticatedRequest(request: ApiRequest, account: UserAccount) {
  return request
    .loginAs(account)
    .withSession({ 'auth.credentialVersion': Number(account.credentialVersion) })
}

test.group('Physical locations directory', (group) => {
  group.each.setup(cleanupTables)

  test('rejects anonymous and unauthorized directory access', async ({ client }) => {
    const anonymous = await client.get('/physical-locations')
    anonymous.assertStatus(401)

    const ordinary = await createAccount(
      'ordinary.location.directory@example.com',
      'Ordinary Directory'
    )
    const unauthorized = await authenticatedRequest(client.get('/physical-locations'), ordinary)
    unauthorized.assertStatus(403)
  })

  test('returns path-ordered active locations and preserves ancestor paths when filtering', async ({
    client,
    assert,
  }) => {
    const account = await createRootActor()
    const campus = await createLocation('Main Campus', null, account.id)
    const block = await createLocation('Administration Block', campus.id, account.id)
    const floor = await createLocation('First Floor', block.id, account.id)
    await createLocation("Principal's Office", floor.id, account.id)
    await createLocation('Former Store', null, account.id, DateTime.now())

    const response = await authenticatedRequest(client.get('/physical-locations'), account)

    response.assertStatus(200)
    assert.deepEqual(
      response.body().data.map((location: { path: string }) => location.path),
      [
        'Main Campus',
        'Main Campus / Administration Block',
        'Main Campus / Administration Block / First Floor',
        "Main Campus / Administration Block / First Floor / Principal's Office",
      ]
    )

    const filtered = await authenticatedRequest(
      client.get('/physical-locations').qs({ search: 'Principal' }),
      account
    )
    filtered.assertStatus(200)
    assert.equal(
      filtered.body().data[0].path,
      "Main Campus / Administration Block / First Floor / Principal's Office"
    )

    const archived = await authenticatedRequest(
      client.get('/physical-locations').qs({ includeArchived: true, search: 'Former' }),
      account
    )
    archived.assertStatus(200)
    assert.equal(archived.body().data[0].name, 'Former Store')
  })

  test('returns effective-dated location history without internal relations', async ({
    client,
    assert,
  }) => {
    const account = await createRootActor()
    const location = await createLocation('Old Store', null, account.id)
    const firstVersion = await PhysicalLocationVersion.findByOrFail(
      'physicalLocationId',
      location.id
    )
    const changedAt = DateTime.now()
    await firstVersion.merge({ effectiveTo: changedAt }).save()
    await location.merge({ name: 'Central Store' }).save()
    await PhysicalLocationVersion.create({
      physicalLocationId: location.id,
      version: 2,
      name: location.name,
      parentId: null,
      archivedAt: null,
      effectiveFrom: changedAt,
      effectiveTo: null,
      changedByAccountId: account.id,
      reason: 'Use the approved store name',
    })

    const detail = await authenticatedRequest(
      client.get(`/physical-locations/${location.id}`),
      account
    )

    detail.assertStatus(200)
    assert.equal(detail.body().data.path, 'Central Store')
    assert.notProperty(detail.body().data, 'versions')

    const response = await authenticatedRequest(
      client.get(`/physical-locations/${location.id}/history`),
      account
    )

    response.assertStatus(200)
    assert.deepEqual(
      response.body().data.map((version: { version: number; name: string }) => ({
        version: version.version,
        name: version.name,
      })),
      [
        { version: 2, name: 'Central Store' },
        { version: 1, name: 'Old Store' },
      ]
    )
    assert.equal(response.body().data[0].changedBy.displayName, 'Root Directory')
    assert.equal(response.body().metadata.currentPage, 1)
  })

  test('authorizes before validating filters or resolving an identifier', async ({ client }) => {
    const ordinary = await createAccount(
      'ordinary.location.validation@example.com',
      'Ordinary Validation'
    )

    const invalidFilter = await authenticatedRequest(
      client.get('/physical-locations').qs({ includeArchived: 'not-a-boolean' }),
      ordinary
    )
    const missing = await authenticatedRequest(
      client.get(`/physical-locations/${randomUUID()}`),
      ordinary
    )

    invalidFilter.assertStatus(403)
    missing.assertStatus(403)
  })
})
