import testUtils from '@adonisjs/core/services/test_utils'
import type { ApiClient, ApiRequest } from '@japa/api-client'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'
import AccessEvent from '#models/access_event'
import OrganizationalUnit from '#models/organizational_unit'
import OrganizationalUnitVersion from '#models/organizational_unit_version'
import Permission from '#models/permission'
import Person from '#models/person'
import Role from '#models/role'
import RoleAssignment from '#models/role_assignment'
import RoleVersion from '#models/role_version'
import RoleVersionPermission from '#models/role_version_permission'
import UserAccount from '#models/user_account'

async function createUnit(
  name: string,
  unitType: 'INSTITUTE' | 'DEPARTMENT' | 'SUB_DEPARTMENT',
  parentId: string | null,
  archivedAt: DateTime | null = null
) {
  const unit = await OrganizationalUnit.create({ name, unitType, parentId, archivedAt })
  await OrganizationalUnitVersion.create({
    organizationalUnitId: unit.id,
    version: 1,
    name,
    unitType,
    parentId,
    archivedAt,
    effectiveFrom: unit.createdAt,
    effectiveTo: null,
    changedByAccountId: null,
    reason: `Create ${name} test unit`,
  })
  return unit
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
    password: 'Administration-pass-1',
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
    reason: 'Organizational administration test role',
    createdByAccountId: null,
  })
  await RoleVersionPermission.create({
    roleVersionId: roleVersion.id,
    permissionKey: permission.key,
  })
  const institute = await createUnit('MaTTI Institute', 'INSTITUTE', null)
  const account = await createAccount('root.administration@example.com', 'Root Administrator')
  await RoleAssignment.create({
    accountId: account.id,
    roleVersionId: roleVersion.id,
    scopeOrgUnitId: institute.id,
    scopeMode: 'INCLUDE_DESCENDANTS',
    startsAt: DateTime.now().minus({ minutes: 1 }),
    expiresAt: null,
    grantedByAccountId: null,
    reason: 'Organizational administration test authority',
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

async function preview(
  client: ApiClient,
  account: UserAccount,
  targetId: string,
  body: {
    operation: 'CREATE_CHILD' | 'REPARENT' | 'ARCHIVE' | 'RESTORE'
    parentId?: string
    childUnitType?: 'DEPARTMENT' | 'SUB_DEPARTMENT'
  }
) {
  return authenticatedRequest(
    client.post(`/organizational-units/${targetId}/access-impact`).json(body),
    account
  )
}

test.group('Organizational units administration', (group) => {
  group.each.setup(cleanupAccessTables)

  test('authorizes before validating organizational writes', async ({ client }) => {
    const account = await createAccount('ordinary.admin@example.com', 'Ordinary Administrator')

    const anonymous = await client.post('/organizational-units').json({})
    const unauthorized = await authenticatedRequest(
      client.post('/organizational-units').json({}),
      account
    )

    anonymous.assertStatus(401)
    unauthorized.assertStatus(403)
  })

  test('creates a strict child unit with history, audit, and a message-only response', async ({
    client,
    assert,
  }) => {
    const { account, institute } = await createRootActor()
    const impact = await preview(client, account, institute.id, {
      operation: 'CREATE_CHILD',
      childUnitType: 'DEPARTMENT',
    })
    impact.assertStatus(200)

    const response = await authenticatedRequest(
      client.post('/organizational-units').json({
        name: 'Finance Department',
        unitType: 'DEPARTMENT',
        parentId: institute.id,
        reason: 'Establish Finance accountability',
        impactFingerprint: impact.body().fingerprint,
      }),
      account
    )

    response.assertStatus(201)
    response.assertBody({ message: 'Organizational unit created.' })
    const department = await OrganizationalUnit.findByOrFail('name', 'Finance')
    assert.equal(department.parentId, institute.id)
    const version = await OrganizationalUnitVersion.findByOrFail(
      'organizationalUnitId',
      department.id
    )
    assert.equal(Number(version.version), 1)
    assert.equal(version.changedByAccountId, account.id)
    const event = await AccessEvent.findByOrFail('eventType', 'ORGANIZATIONAL_UNIT_CREATED')
    assert.equal(event.targetId, department.id)
    assert.equal(event.actorAccountId, account.id)
    assert.equal(event.reason, 'Establish Finance accountability')
  })

  test('rejects a descendant name containing only an organizational suffix', async ({ client }) => {
    const { account, institute } = await createRootActor()
    const impact = await preview(client, account, institute.id, {
      operation: 'CREATE_CHILD',
      childUnitType: 'DEPARTMENT',
    })

    const response = await authenticatedRequest(
      client.post('/organizational-units').json({
        name: 'Department',
        unitType: 'DEPARTMENT',
        parentId: institute.id,
        reason: 'Invalid empty organizational name',
        impactFingerprint: impact.body().fingerprint,
      }),
      account
    )

    response.assertStatus(409)
    response.assertBodyContains({ code: 'E_INVALID_ORGANIZATIONAL_UNIT_CHANGE' })
  })

  test('enforces institute, department, and sub-department parent types', async ({ client }) => {
    const { account, institute } = await createRootActor()
    const department = await createUnit('Finance', 'DEPARTMENT', institute.id)

    const subUnderInstitute = await preview(client, account, institute.id, {
      operation: 'CREATE_CHILD',
      childUnitType: 'SUB_DEPARTMENT',
    })
    const departmentUnderDepartment = await preview(client, account, department.id, {
      operation: 'CREATE_CHILD',
      childUnitType: 'DEPARTMENT',
    })
    const instituteType = await authenticatedRequest(
      client.post('/organizational-units').json({
        name: 'Second Institute',
        unitType: 'INSTITUTE',
        parentId: institute.id,
        reason: 'Invalid hierarchy',
        impactFingerprint: 'a'.repeat(64),
      }),
      account
    )

    subUnderInstitute.assertStatus(409)
    departmentUnderDepartment.assertStatus(409)
    instituteType.assertStatus(422)
  })

  test('rejects duplicate active sibling names without changing history', async ({
    client,
    assert,
  }) => {
    const { account, institute } = await createRootActor()
    await createUnit('Finance', 'DEPARTMENT', institute.id)
    const impact = await preview(client, account, institute.id, {
      operation: 'CREATE_CHILD',
      childUnitType: 'DEPARTMENT',
    })

    const response = await authenticatedRequest(
      client.post('/organizational-units').json({
        name: 'Finance',
        unitType: 'DEPARTMENT',
        parentId: institute.id,
        reason: 'Duplicate Finance unit',
        impactFingerprint: impact.body().fingerprint,
      }),
      account
    )

    response.assertStatus(409)
    response.assertBodyContains({ code: 'E_DUPLICATE' })
    assert.equal(
      await OrganizationalUnit.query()
        .where('name', 'Finance')
        .count('* as total')
        .firstOrFail()
        .then((result) => Number(result.$extras.total)),
      1
    )
  })

  test('renames a unit through a new effective version and audit event', async ({
    client,
    assert,
  }) => {
    const { account, institute } = await createRootActor()
    const department = await createUnit('Administration', 'DEPARTMENT', institute.id)

    const response = await authenticatedRequest(
      client.post(`/organizational-units/${department.id}/rename`).json({
        name: 'Corporate Services Department',
        reason: 'Approved institutional rename',
      }),
      account
    )

    response.assertStatus(200)
    response.assertBody({ message: 'Organizational unit renamed.' })
    await department.refresh()
    assert.equal(department.name, 'Corporate Services')
    const versions = await OrganizationalUnitVersion.query()
      .where('organizational_unit_id', department.id)
      .orderBy('version', 'asc')
    assert.lengthOf(versions, 2)
    assert.isNotNull(versions[0].effectiveTo)
    assert.equal(versions[1].name, 'Corporate Services')
    const event = await AccessEvent.findByOrFail('eventType', 'ORGANIZATIONAL_UNIT_RENAMED')
    assert.equal(event.reason, 'Approved institutional rename')
  })

  test('preserves Institute as part of the sole root name', async ({ client, assert }) => {
    const { account, institute } = await createRootActor()

    const response = await authenticatedRequest(
      client.post(`/organizational-units/${institute.id}/rename`).json({
        name: 'National MaTTI Institute',
        reason: 'Approved institute rename',
      }),
      account
    )

    response.assertStatus(200)
    await institute.refresh()
    assert.equal(institute.name, 'National MaTTI Institute')
  })

  test('moves only a sub-department and preserves both parent versions', async ({
    client,
    assert,
  }) => {
    const { account, institute } = await createRootActor()
    const finance = await createUnit('Finance', 'DEPARTMENT', institute.id)
    const administration = await createUnit('Administration', 'DEPARTMENT', institute.id)
    const accounts = await createUnit('Accounts', 'SUB_DEPARTMENT', finance.id)
    const impact = await preview(client, account, accounts.id, {
      operation: 'REPARENT',
      parentId: administration.id,
    })

    const response = await authenticatedRequest(
      client.post(`/organizational-units/${accounts.id}/reparent`).json({
        parentId: administration.id,
        reason: 'Move Accounts to Corporate Services',
        impactFingerprint: impact.body().fingerprint,
      }),
      account
    )

    response.assertStatus(200)
    await accounts.refresh()
    assert.equal(accounts.parentId, administration.id)
    const versions = await OrganizationalUnitVersion.query()
      .where('organizational_unit_id', accounts.id)
      .orderBy('version', 'asc')
    assert.deepEqual(
      versions.map((version) => version.parentId),
      [finance.id, administration.id]
    )

    const departmentImpact = await preview(client, account, finance.id, {
      operation: 'REPARENT',
      parentId: administration.id,
    })
    departmentImpact.assertStatus(409)
  })

  test('archives children before parents and restores parents before children', async ({
    client,
    assert,
  }) => {
    const { account, institute } = await createRootActor()
    const department = await createUnit('Finance', 'DEPARTMENT', institute.id)
    const child = await createUnit('Accounts', 'SUB_DEPARTMENT', department.id)

    const blockedParent = await preview(client, account, department.id, {
      operation: 'ARCHIVE',
    })
    blockedParent.assertStatus(409)

    const childArchiveImpact = await preview(client, account, child.id, {
      operation: 'ARCHIVE',
    })
    const childArchive = await authenticatedRequest(
      client.post(`/organizational-units/${child.id}/archive`).json({
        reason: 'Archive former Accounts unit',
        impactFingerprint: childArchiveImpact.body().fingerprint,
      }),
      account
    )
    childArchive.assertStatus(200)

    const parentArchiveImpact = await preview(client, account, department.id, {
      operation: 'ARCHIVE',
    })
    const parentArchive = await authenticatedRequest(
      client.post(`/organizational-units/${department.id}/archive`).json({
        reason: 'Archive former Finance unit',
        impactFingerprint: parentArchiveImpact.body().fingerprint,
      }),
      account
    )
    parentArchive.assertStatus(200)

    const blockedChildRestore = await preview(client, account, child.id, {
      operation: 'RESTORE',
    })
    blockedChildRestore.assertStatus(409)

    const parentRestoreImpact = await preview(client, account, department.id, {
      operation: 'RESTORE',
    })
    const parentRestore = await authenticatedRequest(
      client.post(`/organizational-units/${department.id}/restore`).json({
        reason: 'Restore Finance accountability',
        impactFingerprint: parentRestoreImpact.body().fingerprint,
      }),
      account
    )
    parentRestore.assertStatus(200)

    const childRestoreImpact = await preview(client, account, child.id, {
      operation: 'RESTORE',
    })
    const childRestore = await authenticatedRequest(
      client.post(`/organizational-units/${child.id}/restore`).json({
        reason: 'Restore Accounts accountability',
        impactFingerprint: childRestoreImpact.body().fingerprint,
      }),
      account
    )
    childRestore.assertStatus(200)

    await department.refresh()
    await child.refresh()
    assert.isNull(department.archivedAt)
    assert.isNull(child.archivedAt)
    assert.equal(
      await OrganizationalUnitVersion.query()
        .where('organizational_unit_id', child.id)
        .count('* as total')
        .firstOrFail()
        .then((result) => Number(result.$extras.total)),
      3
    )
  })

  test('never archives or restores the institute root', async ({ client }) => {
    const { account, institute } = await createRootActor()

    const archive = await preview(client, account, institute.id, { operation: 'ARCHIVE' })
    const restore = await preview(client, account, institute.id, { operation: 'RESTORE' })

    archive.assertStatus(409)
    restore.assertStatus(409)
  })
})
