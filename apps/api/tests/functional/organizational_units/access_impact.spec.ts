import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import type { ApiRequest } from '@japa/api-client'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'
import AccessAuthorityChangedException from '#exceptions/access_authority_changed_exception'
import StaleOrganizationalAccessImpactException from '#exceptions/stale_organizational_access_impact_exception'
import OrganizationalUnit from '#models/organizational_unit'
import OrganizationalUnitVersion from '#models/organizational_unit_version'
import Permission from '#models/permission'
import Person from '#models/person'
import Role from '#models/role'
import RoleAssignment from '#models/role_assignment'
import RoleVersion from '#models/role_version'
import RoleVersionPermission from '#models/role_version_permission'
import UserAccount from '#models/user_account'
import OrganizationalAccessImpactService from '#services/organizational_access_impact_service'
import OrganizationalUnitAdministrationService from '#services/organizational_unit_administration_service'
import OrganizationalUnitProvisioningService from '#services/organizational_unit_provisioning_service'

async function createUnit(
  name: string,
  unitType: 'INSTITUTE' | 'DEPARTMENT' | 'SUB_DEPARTMENT',
  parentId: string | null
) {
  const unit = await OrganizationalUnit.create({ name, unitType, parentId })
  await OrganizationalUnitVersion.create({
    organizationalUnitId: unit.id,
    version: 1,
    name,
    unitType,
    parentId,
    archivedAt: null,
    effectiveFrom: unit.createdAt,
    effectiveTo: null,
    changedByAccountId: null,
    reason: `Create ${name} impact test unit`,
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
    password: 'Impact-password-1',
    status: 'ACTIVE',
    credentialVersion: 1,
    passwordResetVersion: 0,
  })
}

async function createRegistry() {
  const permission = await Permission.create({
    key: 'access.root',
    description: 'Administer identity, access, and organizational authority',
    customRoleAssignable: false,
  })
  const rootRole = await Role.create({
    key: 'MASTER_ADMIN',
    name: 'Master Admin',
    systemManaged: true,
  })
  const rootVersion = await RoleVersion.create({
    roleId: rootRole.id,
    version: 1,
    reason: 'Organizational impact root role',
    createdByAccountId: null,
  })
  await RoleVersionPermission.create({
    roleVersionId: rootVersion.id,
    permissionKey: permission.key,
  })
  const scopedRole = await Role.create({
    key: 'SCOPED_REVIEWER',
    name: 'Scoped Reviewer',
    systemManaged: false,
  })
  const scopedVersion = await RoleVersion.create({
    roleId: scopedRole.id,
    version: 1,
    reason: 'Organizational impact scoped role',
    createdByAccountId: null,
  })

  return { rootVersion, scopedVersion }
}

async function createRootActor(institute: OrganizationalUnit, roleVersion: RoleVersion) {
  const account = await createAccount('root.impact@example.com', 'Root Impact')
  const assignment = await RoleAssignment.create({
    accountId: account.id,
    roleVersionId: roleVersion.id,
    scopeOrgUnitId: institute.id,
    scopeMode: 'INCLUDE_DESCENDANTS',
    startsAt: DateTime.now().minus({ minutes: 1 }),
    expiresAt: null,
    grantedByAccountId: null,
    reason: 'Organizational impact root authority',
  })
  return { account, assignment }
}

async function createScopedAssignment(
  account: UserAccount,
  roleVersion: RoleVersion,
  scope: OrganizationalUnit,
  scopeMode: 'THIS_NODE_ONLY' | 'INCLUDE_DESCENDANTS'
) {
  return RoleAssignment.create({
    accountId: account.id,
    roleVersionId: roleVersion.id,
    scopeOrgUnitId: scope.id,
    scopeMode,
    startsAt: DateTime.now().minus({ minutes: 1 }),
    expiresAt: null,
    grantedByAccountId: null,
    reason: 'Organizational impact scoped assignment',
  })
}

function cleanupAccessTables() {
  return testUtils.db().truncate()
}

function authenticatedRequest(request: ApiRequest, account: UserAccount) {
  return request
    .loginAs(account)
    .withSession({ 'auth.credentialVersion': Number(account.credentialVersion) })
}

test.group('Organizational units access impact', (group) => {
  group.each.setup(cleanupAccessTables)

  test('previews assignments that gain access to a newly created descendant', async ({
    client,
    assert,
  }) => {
    const institute = await createUnit('Matti Institute', 'INSTITUTE', null)
    const department = await createUnit('Finance', 'DEPARTMENT', institute.id)
    const { rootVersion, scopedVersion } = await createRegistry()
    const { account: actor, assignment: rootAssignment } = await createRootActor(
      institute,
      rootVersion
    )
    const scopedAccount = await createAccount('scoped.create@example.com', 'Scoped Create')
    const scopedAssignment = await createScopedAssignment(
      scopedAccount,
      scopedVersion,
      department,
      'INCLUDE_DESCENDANTS'
    )
    const nodeOnlyAccount = await createAccount('node.create@example.com', 'Node Create')
    await createScopedAssignment(nodeOnlyAccount, scopedVersion, department, 'THIS_NODE_ONLY')

    const response = await authenticatedRequest(
      client.post(`/organizational-units/${department.id}/access-impact`).json({
        operation: 'CREATE_CHILD',
        childUnitType: 'SUB_DEPARTMENT',
      }),
      actor
    )

    response.assertStatus(200)
    assert.match(response.body().fingerprint, /^[0-9a-f]{64}$/)
    assert.deepEqual(
      response
        .body()
        .assignments.map((assignment: { id: string }) => assignment.id)
        .sort(),
      [rootAssignment.id, scopedAssignment.id].sort()
    )
    assert.deepInclude(
      response
        .body()
        .assignments.find((assignment: { id: string }) => assignment.id === scopedAssignment.id),
      {
        account: {
          id: scopedAccount.id,
          displayName: 'Scoped Create',
          status: 'ACTIVE',
        },
        scope: {
          organizationalUnitId: department.id,
          name: 'Finance',
          mode: 'INCLUDE_DESCENDANTS',
        },
      }
    )
  })

  test('previews only scopes whose descendant access changes during a move', async ({
    client,
    assert,
  }) => {
    const institute = await createUnit('Matti Institute', 'INSTITUTE', null)
    const finance = await createUnit('Finance', 'DEPARTMENT', institute.id)
    const administration = await createUnit('Administration', 'DEPARTMENT', institute.id)
    const accounts = await createUnit('Accounts', 'SUB_DEPARTMENT', finance.id)
    const { rootVersion, scopedVersion } = await createRegistry()
    const { account: actor, assignment: rootAssignment } = await createRootActor(
      institute,
      rootVersion
    )
    const financeAccount = await createAccount('finance.impact@example.com', 'Finance Impact')
    const financeAssignment = await createScopedAssignment(
      financeAccount,
      scopedVersion,
      finance,
      'INCLUDE_DESCENDANTS'
    )
    const administrationAccount = await createAccount(
      'administration.impact@example.com',
      'Administration Impact'
    )
    const administrationAssignment = await createScopedAssignment(
      administrationAccount,
      scopedVersion,
      administration,
      'INCLUDE_DESCENDANTS'
    )

    const response = await authenticatedRequest(
      client.post(`/organizational-units/${accounts.id}/access-impact`).json({
        operation: 'REPARENT',
        parentId: administration.id,
      }),
      actor
    )

    response.assertStatus(200)
    assert.deepEqual(
      response
        .body()
        .assignments.map((assignment: { id: string }) => assignment.id)
        .sort(),
      [financeAssignment.id, administrationAssignment.id].sort()
    )
    assert.notInclude(
      response.body().assignments.map((assignment: { id: string }) => assignment.id),
      rootAssignment.id
    )
  })

  test('rejects a mutation when its reviewed assignment set becomes stale', async ({
    client,
    assert,
  }) => {
    const institute = await createUnit('Matti Institute', 'INSTITUTE', null)
    const department = await createUnit('Finance', 'DEPARTMENT', institute.id)
    const child = await createUnit('Accounts', 'SUB_DEPARTMENT', department.id)
    const { rootVersion, scopedVersion } = await createRegistry()
    const { account: actor } = await createRootActor(institute, rootVersion)

    const preview = await authenticatedRequest(
      client.post(`/organizational-units/${child.id}/access-impact`).json({
        operation: 'ARCHIVE',
      }),
      actor
    )
    preview.assertStatus(200)

    const newlyAffected = await createAccount('newly.affected@example.com', 'Newly Affected')
    await createScopedAssignment(newlyAffected, scopedVersion, child, 'THIS_NODE_ONLY')

    const mutation = await authenticatedRequest(
      client.post(`/organizational-units/${child.id}/archive`).json({
        reason: 'Archive after a stale review',
        impactFingerprint: preview.body().fingerprint,
      }),
      actor
    )

    mutation.assertStatus(409)
    mutation.assertBodyContains({ code: 'E_STALE_ORGANIZATIONAL_ACCESS_IMPACT' })
    await child.refresh()
    assert.isNull(child.archivedAt)
    assert.lengthOf(
      await OrganizationalUnitVersion.query().where('organizational_unit_id', child.id),
      1
    )
  })

  test('revalidates root authority inside the hierarchy transaction', async ({ assert }) => {
    const institute = await createUnit('Matti Institute', 'INSTITUTE', null)
    const department = await createUnit('Finance', 'DEPARTMENT', institute.id)
    const { rootVersion } = await createRegistry()
    const { account: actor, assignment } = await createRootActor(institute, rootVersion)
    const impactService = await app.container.make(OrganizationalAccessImpactService)
    const provisioning = await app.container.make(OrganizationalUnitProvisioningService)
    const impact = await impactService.preview({
      operation: 'CREATE_CHILD',
      targetUnitId: department.id,
      childUnitType: 'SUB_DEPARTMENT',
    })
    await assignment.delete()

    try {
      await provisioning.create(
        {
          name: 'Accounts',
          unitType: 'SUB_DEPARTMENT',
          parentId: department.id,
          reason: 'Authority changed before commit',
          impactFingerprint: impact.fingerprint,
        },
        actor.id
      )
      assert.fail('Expected changed root authority to reject organizational provisioning')
    } catch (error) {
      assert.instanceOf(error, AccessAuthorityChangedException)
    }

    assert.isNull(await OrganizationalUnit.findBy('name', 'Accounts'))
  })

  test('serializes concurrent hierarchy changes and accepts only one reviewed move', async ({
    assert,
  }) => {
    const institute = await createUnit('Matti Institute', 'INSTITUTE', null)
    const finance = await createUnit('Finance', 'DEPARTMENT', institute.id)
    const administration = await createUnit('Administration', 'DEPARTMENT', institute.id)
    const academics = await createUnit('Academics', 'DEPARTMENT', institute.id)
    const accounts = await createUnit('Accounts', 'SUB_DEPARTMENT', finance.id)
    const { rootVersion } = await createRegistry()
    const { account: actor } = await createRootActor(institute, rootVersion)
    const impactService = await app.container.make(OrganizationalAccessImpactService)
    const administrationService = await app.container.make(OrganizationalUnitAdministrationService)
    const [administrationImpact, academicsImpact] = await Promise.all([
      impactService.preview({
        operation: 'REPARENT',
        targetUnitId: accounts.id,
        parentId: administration.id,
      }),
      impactService.preview({
        operation: 'REPARENT',
        targetUnitId: accounts.id,
        parentId: academics.id,
      }),
    ])

    const results = await Promise.allSettled([
      administrationService.reparent(
        accounts.id,
        {
          parentId: administration.id,
          reason: 'Move Accounts to Administration',
          impactFingerprint: administrationImpact.fingerprint,
        },
        actor.id
      ),
      administrationService.reparent(
        accounts.id,
        {
          parentId: academics.id,
          reason: 'Move Accounts to Academics',
          impactFingerprint: academicsImpact.fingerprint,
        },
        actor.id
      ),
    ])

    assert.lengthOf(
      results.filter((result) => result.status === 'fulfilled'),
      1
    )
    assert.instanceOf(
      results.find((result) => result.status === 'rejected')?.status === 'rejected'
        ? (results.find((result) => result.status === 'rejected') as PromiseRejectedResult).reason
        : null,
      StaleOrganizationalAccessImpactException
    )
    assert.lengthOf(
      await OrganizationalUnitVersion.query().where('organizational_unit_id', accounts.id),
      2
    )
  })
})
