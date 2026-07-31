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
import RoleAssignmentTermination from '#models/role_assignment_termination'
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
    password: 'Role-assignment-directory-password-1',
    status: 'ACTIVE',
    credentialVersion: 1,
    passwordResetVersion: 0,
  })
}

async function createFixture() {
  const rootPermission = await Permission.create({
    key: 'access.root',
    description: 'Administer identity, access, and organizational authority',
    customRoleAssignable: false,
  })
  const countPermission = await Permission.create({
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
    reason: 'Assignment directory root',
    createdByAccountId: null,
  })
  await RoleVersionPermission.create({
    roleVersionId: rootVersion.id,
    permissionKey: rootPermission.key,
  })
  const role = await Role.create({
    key: `CUSTOM_${randomUUID().replaceAll('-', '').toUpperCase()}`,
    name: 'Department Counter',
    systemManaged: false,
  })
  const version = await RoleVersion.create({
    roleId: role.id,
    version: 1,
    reason: 'Assignment directory role',
    createdByAccountId: null,
  })
  await RoleVersionPermission.create({
    roleVersionId: version.id,
    permissionKey: countPermission.key,
  })
  const institute = await OrganizationalUnit.create({
    name: 'Matti Institute',
    unitType: 'INSTITUTE',
    parentId: null,
  })
  const department = await OrganizationalUnit.create({
    name: 'Engineering',
    unitType: 'DEPARTMENT',
    parentId: institute.id,
  })
  const actor = await createAccount('root.assignment.directory@example.com', 'Root Directory')
  const target = await createAccount('counter.assignment.directory@example.com', 'Counter')
  await RoleAssignment.create({
    accountId: actor.id,
    roleVersionId: rootVersion.id,
    scopeOrgUnitId: institute.id,
    scopeMode: 'INCLUDE_DESCENDANTS',
    startsAt: DateTime.now().minus({ minutes: 1 }),
    expiresAt: null,
    grantedByAccountId: null,
    reason: 'Assignment directory authority',
  })

  return { actor, department, role, target, version }
}

function cleanupTables() {
  return testUtils.db().truncate()
}

function authenticatedRequest(request: ApiRequest, account: UserAccount) {
  return request
    .loginAs(account)
    .withSession({ 'auth.credentialVersion': Number(account.credentialVersion) })
}

test.group('Role assignments directory', (group) => {
  group.each.setup(cleanupTables)

  test('rejects anonymous and unauthorized reads', async ({ client }) => {
    const ordinary = await createAccount('ordinary.assignment.directory@example.com', 'Ordinary')

    const anonymous = await client.get('/role-assignments')
    const unauthorized = await authenticatedRequest(client.get('/role-assignments'), ordinary)

    anonymous.assertStatus(401)
    unauthorized.assertStatus(403)
  })

  test('lists filtered assignments with lightweight lifecycle, role, and scope context', async ({
    client,
    assert,
  }) => {
    const fixture = await createFixture()
    const assignment = await RoleAssignment.create({
      accountId: fixture.target.id,
      roleVersionId: fixture.version.id,
      scopeOrgUnitId: fixture.department.id,
      scopeMode: 'INCLUDE_DESCENDANTS',
      startsAt: DateTime.now().minus({ days: 1 }),
      expiresAt: DateTime.now().plus({ days: 5 }),
      grantedByAccountId: fixture.actor.id,
      reason: 'Count Engineering stock',
    })

    const response = await authenticatedRequest(
      client.get('/role-assignments').qs({
        accountId: fixture.target.id,
        roleId: fixture.role.id,
        status: 'ACTIVE',
      }),
      fixture.actor
    )

    response.assertStatus(200)
    assert.lengthOf(response.body().data, 1)
    assert.deepInclude(response.body().data[0], {
      id: assignment.id,
      account: {
        id: fixture.target.id,
        displayName: 'Counter',
        email: 'counter.assignment.directory@example.com',
        status: 'ACTIVE',
      },
      role: {
        id: fixture.role.id,
        key: fixture.role.key,
        name: 'Department Counter',
        versionId: fixture.version.id,
        version: 1,
      },
      scope: {
        organizationalUnitId: fixture.department.id,
        name: 'Engineering',
        path: 'Matti Institute / Engineering',
        unitType: 'DEPARTMENT',
        mode: 'INCLUDE_DESCENDANTS',
      },
      status: 'ACTIVE',
      effectiveNow: true,
    })
    assert.notProperty(response.body().data[0].account, 'password')
    assert.notProperty(response.body().data[0], 'reason')
    assert.notProperty(response.body().data[0], 'grantedBy')
    assert.notProperty(response.body().data[0], 'termination')
    assert.notProperty(response.body().data[0], 'ineffectiveReasons')
    assert.notProperty(response.body().data[0].role, 'permissionKeys')
  })

  test('returns the same derived lifecycle category for every SQL status filter', async ({
    client,
    assert,
  }) => {
    const fixture = await createFixture()
    const now = DateTime.now()
    const records: Array<{
      status: 'UPCOMING' | 'ACTIVE' | 'EXPIRED' | 'ENDED' | 'CANCELLED' | 'REPLACED'
      assignment: RoleAssignment
    }> = []

    for (const status of [
      'UPCOMING',
      'ACTIVE',
      'EXPIRED',
      'ENDED',
      'CANCELLED',
      'REPLACED',
    ] as const) {
      const assignment = await RoleAssignment.create({
        accountId: fixture.target.id,
        roleVersionId: fixture.version.id,
        scopeOrgUnitId: fixture.department.id,
        scopeMode: 'THIS_NODE_ONLY',
        startsAt: status === 'UPCOMING' ? now.plus({ days: 1 }) : now.minus({ days: 1 }),
        expiresAt: status === 'EXPIRED' ? now.minus({ minutes: 1 }) : now.plus({ days: 2 }),
        grantedByAccountId: fixture.actor.id,
        reason: `Lifecycle fixture for ${status}`,
      })
      if (status === 'ENDED' || status === 'CANCELLED' || status === 'REPLACED') {
        const replacement =
          status === 'REPLACED'
            ? await RoleAssignment.create({
                accountId: fixture.actor.id,
                roleVersionId: fixture.version.id,
                scopeOrgUnitId: fixture.department.id,
                scopeMode: 'THIS_NODE_ONLY',
                startsAt: now.plus({ days: 1 }),
                expiresAt: now.plus({ days: 3 }),
                grantedByAccountId: fixture.actor.id,
                reason: 'Replacement lifecycle fixture',
              })
            : null
        await RoleAssignmentTermination.create({
          assignmentId: assignment.id,
          kind: status,
          effectiveAt: now,
          replacementAssignmentId: replacement?.id ?? null,
          terminatedByAccountId: fixture.actor.id,
          reason: `End ${status.toLowerCase()} fixture`,
        })
      }
      records.push({ status, assignment })
    }

    for (const { status, assignment } of records) {
      const response = await authenticatedRequest(
        client.get('/role-assignments').qs({
          accountId: fixture.target.id,
          status,
        }),
        fixture.actor
      )
      response.assertStatus(200)
      assert.deepEqual(
        response.body().data.map(({ id }: { id: string }) => id),
        [assignment.id]
      )
      assert.equal(response.body().data[0].status, status)
    }
  })

  test('shows cancellation and immutable original grant details', async ({ client, assert }) => {
    const fixture = await createFixture()
    const startsAt = DateTime.now().plus({ days: 2 })
    const assignment = await RoleAssignment.create({
      accountId: fixture.target.id,
      roleVersionId: fixture.version.id,
      scopeOrgUnitId: fixture.department.id,
      scopeMode: 'THIS_NODE_ONLY',
      startsAt,
      expiresAt: startsAt.plus({ days: 2 }),
      grantedByAccountId: fixture.actor.id,
      reason: 'Planned count coverage',
    })
    await RoleAssignmentTermination.create({
      assignmentId: assignment.id,
      kind: 'CANCELLED',
      effectiveAt: DateTime.now(),
      replacementAssignmentId: null,
      terminatedByAccountId: fixture.actor.id,
      reason: 'The planned count was cancelled',
    })

    const response = await authenticatedRequest(
      client.get(`/role-assignments/${assignment.id}`),
      fixture.actor
    )

    response.assertStatus(200)
    assert.equal(response.body().data.status, 'CANCELLED')
    assert.equal(response.body().data.effectiveNow, false)
    assert.equal(response.body().data.startsAt, startsAt.toISO())
    assert.deepEqual(response.body().data.role.permissionKeys, ['stocktake.count'])
    assert.equal(response.body().data.reason, 'Planned count coverage')
    assert.deepInclude(response.body().data.termination, {
      kind: 'CANCELLED',
      reason: 'The planned count was cancelled',
      replacementAssignmentId: null,
    })
  })
})
