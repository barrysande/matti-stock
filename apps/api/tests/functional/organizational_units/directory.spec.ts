import { randomUUID } from 'node:crypto'
import testUtils from '@adonisjs/core/services/test_utils'
import type { ApiRequest } from '@japa/api-client'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'
import OrganizationalUnit from '#models/organizational_unit'
import OrganizationalUnitVersion from '#models/organizational_unit_version'
import Permission from '#models/permission'
import Person from '#models/person'
import Role from '#models/role'
import RoleAssignment from '#models/role_assignment'
import RoleVersion from '#models/role_version'
import RoleVersionPermission from '#models/role_version_permission'
import UserAccount from '#models/user_account'

async function createVersion(
  unit: OrganizationalUnit,
  version: number,
  effectiveFrom: DateTime,
  effectiveTo: DateTime | null = null,
  name = unit.name
) {
  return OrganizationalUnitVersion.create({
    organizationalUnitId: unit.id,
    version,
    name,
    unitType: unit.unitType,
    parentId: unit.parentId,
    archivedAt: unit.archivedAt,
    effectiveFrom,
    effectiveTo,
    changedByAccountId: null,
    reason: `Record ${name}`,
  })
}

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
    reason: 'Organizational directory test role',
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
  await createVersion(institute, 1, institute.createdAt)
  const account = await createAccount('root.directory@example.com', 'Root Directory')
  await RoleAssignment.create({
    accountId: account.id,
    roleVersionId: roleVersion.id,
    scopeOrgUnitId: institute.id,
    scopeMode: 'INCLUDE_DESCENDANTS',
    startsAt: DateTime.now().minus({ minutes: 1 }),
    expiresAt: null,
    grantedByAccountId: null,
    reason: 'Directory test authority',
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

test.group('Organizational units directory', (group) => {
  group.each.setup(cleanupAccessTables)

  test('rejects anonymous directory and detail requests', async ({ client }) => {
    const unitId = randomUUID()

    const directory = await client.get('/organizational-units')
    const details = await client.get(`/organizational-units/${unitId}`)

    directory.assertStatus(401)
    details.assertStatus(401)
  })

  test('denies directory and detail access without access.root', async ({ client }) => {
    const account = await createAccount('ordinary.directory@example.com', 'Ordinary Directory')
    const unitId = randomUUID()

    const directory = await authenticatedRequest(client.get('/organizational-units'), account)
    const details = await authenticatedRequest(
      client.get(`/organizational-units/${unitId}`),
      account
    )

    directory.assertStatus(403)
    details.assertStatus(403)
  })

  test('returns safe path-ordered active hierarchy data and supports filters', async ({
    client,
    assert,
  }) => {
    const { account, institute } = await createRootActor()
    const department = await OrganizationalUnit.create({
      name: 'Finance',
      unitType: 'DEPARTMENT',
      parentId: institute.id,
    })
    await createVersion(department, 1, department.createdAt)
    const subDepartment = await OrganizationalUnit.create({
      name: 'Accounts',
      unitType: 'SUB_DEPARTMENT',
      parentId: department.id,
    })
    await createVersion(subDepartment, 1, subDepartment.createdAt)
    const archived = await OrganizationalUnit.create({
      name: 'Former Office',
      unitType: 'DEPARTMENT',
      parentId: institute.id,
      archivedAt: DateTime.now(),
    })
    await createVersion(archived, 1, archived.createdAt)

    const response = await authenticatedRequest(client.get('/organizational-units'), account)

    response.assertStatus(200)
    assert.deepEqual(
      response.body().data.map((unit: { name: string }) => unit.name),
      ['MaTTI Institute', 'Finance', 'Accounts']
    )
    assert.deepEqual(
      response.body().data.map((unit: { path: string }) => unit.path),
      [
        'MaTTI Institute / Finance',
        'MaTTI Institute / Finance / Accounts',
        'MaTTI Institute',
      ].sort()
    )
    assert.notProperty(response.body().data[0], 'roleAssignments')

    const filtered = await authenticatedRequest(
      client.get('/organizational-units').qs({
        includeArchived: true,
        unitType: 'DEPARTMENT',
        search: 'Former',
      }),
      account
    )

    filtered.assertStatus(200)
    assert.deepEqual(
      filtered.body().data.map((unit: { id: string }) => unit.id),
      [archived.id]
    )
    assert.equal(filtered.body().data[0].path, 'MaTTI Institute / Former Office')

    const filteredSubDepartments = await authenticatedRequest(
      client.get('/organizational-units').qs({ unitType: 'SUB_DEPARTMENT' }),
      account
    )

    filteredSubDepartments.assertStatus(200)
    assert.deepEqual(
      filteredSubDepartments.body().data.map((unit: { id: string; path: string }) => ({
        id: unit.id,
        path: unit.path,
      })),
      [{ id: subDepartment.id, path: 'MaTTI Institute / Finance / Accounts' }]
    )
  })

  test('returns paginated effective-dated structural history', async ({
    client,
    assert,
  }) => {
    const { account, institute } = await createRootActor()
    const firstEffectiveFrom = DateTime.now().minus({ days: 2 })
    const changedAt = DateTime.now().minus({ day: 1 })
    const department = await OrganizationalUnit.create({
      name: 'Corporate Services',
      unitType: 'DEPARTMENT',
      parentId: institute.id,
    })
    await createVersion(department, 1, firstEffectiveFrom, changedAt, 'Administration')
    await createVersion(department, 2, changedAt)

    const detail = await authenticatedRequest(
      client.get(`/organizational-units/${department.id}`),
      account
    )

    detail.assertStatus(200)
    assert.equal(detail.body().data.path, 'MaTTI Institute / Corporate Services')
    assert.notProperty(detail.body().data, 'versions')

    const response = await authenticatedRequest(
      client.get(`/organizational-units/${department.id}/history`),
      account
    )

    response.assertStatus(200)
    assert.deepEqual(
      response.body().data.map((version: { version: number; name: string }) => ({
        version: version.version,
        name: version.name,
      })),
      [
        { version: 2, name: 'Corporate Services' },
        { version: 1, name: 'Administration' },
      ]
    )
    assert.equal(response.body().metadata.currentPage, 1)
  })

  test('validates directory filters before querying', async ({ client }) => {
    const { account } = await createRootActor()
    const response = await authenticatedRequest(
      client
        .get('/organizational-units')
        .qs({ unitType: 'UNKNOWN', includeArchived: 'not-a-boolean' }),
      account
    )

    response.assertStatus(422)
  })
})
